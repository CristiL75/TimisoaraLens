# Securitatea aplicatiei TimisoaraLens

Acest document poate fi folosit ca material separat pentru sectiunea de securitate din lucrarea de licenta. El completeaza documentul de implementare si grupeaza masurile care tin de protectia datelor, configurarea cheilor, autentificare, autorizare, plati si componente AI.

## 1. Gestionarea secretelor prin variabile de mediu

Aplicatia foloseste mai multe chei si tokenuri sensibile, precum `SECRET_KEY`, `STRIPE_SECRET_KEY`, `OPENAI_API_KEY` si `QDRANT_API_KEY`. Aceste valori nu trebuie salvate direct in codul sursa, deoarece ar putea fi expuse accidental prin repository, arhive, capturi de ecran sau fisiere trimise catre alte persoane. In schimb, ele trebuie configurate prin variabile de mediu, separat pentru dezvoltare locala si productie.

Un exemplu important este `SECRET_KEY`, cheia folosita pentru semnarea tokenurilor JWT. Daca aceasta cheie este cunoscuta sau ramane la valoarea implicita, un atacator ar putea incerca sa genereze tokenuri false. Din acest motiv, backend-ul verifica in productie daca `SECRET_KEY` este setata explicit si daca nu foloseste valoarea default.

## 1.1 Implementare in proiect

Fisier: `backend/auth_utils.py`

```python
DEFAULT_SECRET_KEY = "your-secret-key-change-this-in-production-12345"

def _load_secret_key() -> str:
    configured_secret = os.getenv("SECRET_KEY")
    environment = (os.getenv("APP_ENV") or os.getenv("ENVIRONMENT") or "").strip().lower()
    is_production = environment in {"prod", "production"} or bool(os.getenv("RENDER"))

    if configured_secret and configured_secret != DEFAULT_SECRET_KEY:
        return configured_secret

    if is_production:
        raise RuntimeError(
            "SECRET_KEY must be set to a strong, non-default value in production."
        )

    return DEFAULT_SECRET_KEY
```

## 1.2 Explicatie

Fragmentul separa comportamentul din dezvoltare de cel din productie. In mediul local, fallback-ul permite rularea rapida a aplicatiei fara configurari suplimentare. In productie, insa, aplicatia refuza pornirea daca `SECRET_KEY` lipseste sau are valoarea implicita. Aceasta masura reduce riscul ca tokenurile JWT sa fie semnate cu o cheie previzibila.

## 1.3 Paragraf gata de inclus in lucrare

Pentru protejarea datelor sensibile, aplicatia utilizeaza variabile de mediu pentru configurarea cheilor private si a tokenurilor de acces. Chei precum `SECRET_KEY`, `STRIPE_SECRET_KEY`, `OPENAI_API_KEY` si `QDRANT_API_KEY` nu sunt stocate direct in cod, ci sunt furnizate de mediul de rulare. In cazul cheii JWT, backend-ul verifica la pornire daca aplicatia ruleaza in productie si opreste initializarea atunci cand cheia lipseste sau are valoarea implicita. Aceasta abordare previne utilizarea unor configurari nesigure in mediul public.

## 1.4 Recomandari practice

- `SECRET_KEY` trebuie sa fie o valoare lunga, aleatoare si imposibil de ghicit.
- Cheile pentru Stripe, OpenAI si Qdrant trebuie configurate doar in platforma de deploy sau in fisierul `.env` local, care nu se publica in repository.
- Valorile secrete nu trebuie afisate in loguri.
- Pentru productie, cheia JWT nu trebuie sa aiba fallback default.
- In cazul in care o cheie este expusa, aceasta trebuie regenerata si inlocuita imediat.

## 2. Directii urmatoare de securitate

## 2. Refresh token si expirare controlata

Initial, autentificarea se baza pe un singur token JWT cu durata mai mare de viata. Pentru a reduce riscul in cazul compromiterii tokenului, mecanismul a fost extins cu doua tipuri de tokenuri:

- `access_token`, folosit pentru autentificarea cererilor catre API si configurat cu durata scurta de viata;
- `refresh_token`, folosit pentru obtinerea unui nou access token fara reintroducerea credentialelor.

Refresh tokenul este o valoare opaca, generata aleator, care nu contine date despre utilizator. In baza de date este salvat doar hash-ul acestuia, nu tokenul in clar. La fiecare refresh, tokenul vechi este revocat si inlocuit cu unul nou, mecanism cunoscut ca rotatie a refresh tokenurilor.

## 2.1 Implementare backend

Fisier: `backend/api/auth.py`

```python
async def _issue_token_pair(user: dict) -> Token:
    access_token = create_access_token(
        data={"sub": user["username"], "username": user["username"], "email": user["email"]}
    )
    refresh_token = await _store_refresh_token(user)
    return Token(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )
```

### Explicatie

Functia genereaza perechea de tokenuri returnata la autentificare. Access tokenul este semnat JWT si are durata scurta de viata, iar refresh tokenul este salvat in MongoDB sub forma de hash. Clientul primeste ambele tokenuri, dar foloseste access tokenul pentru cererile obisnuite.

## 2.2 Rotatia refresh tokenului

Fisier: `backend/api/auth.py`

```python
@router.post("/refresh", response_model=Token)
async def refresh_token(body: RefreshTokenRequest):
    token_doc = await refresh_tokens.find_one({
        "token_hash": _hash_refresh_token(body.refresh_token),
        "revoked_at": None,
        "expires_at": {"$gt": datetime.utcnow()},
    })
    if not token_doc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

    new_token_pair = await _issue_token_pair(user)
    await refresh_tokens.update_one(
        {"_id": token_doc["_id"]},
        {"$set": {"revoked_at": datetime.utcnow()}}
    )
    return new_token_pair
```

### Explicatie

Endpoint-ul `/auth/refresh` verifica daca refresh tokenul exista, nu este revocat si nu a expirat. Dupa validare, sistemul emite o noua pereche de tokenuri si revoca refresh tokenul vechi. In acest mod, acelasi refresh token nu poate fi reutilizat pe termen nelimitat.

## 2.3 Logout cu invalidarea tokenurilor

Fisier: `backend/api/auth.py`

```python
@router.post("/logout")
async def logout(body: LogoutRequest, request: Request):
    await _revoke_refresh_token(body.refresh_token)
    await _revoke_access_token_from_header(request)
    return {"success": True}
```

### Explicatie

Logout-ul nu se limiteaza la stergerea tokenului din aplicatia mobila. Backend-ul revoca refresh tokenul si adauga identificatorul access tokenului curent intr-o lista de tokenuri revocate. Astfel, tokenul nu mai poate fi folosit pana la expirarea naturala.

## 2.4 Implementare in aplicatia mobila

Fisier: `mobile/src/services/api.js`

```javascript
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config || {};
    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;
    const newAccessToken = await refreshAccessToken();
    originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
    return api(originalRequest);
  }
);
```

### Explicatie

Aplicatia mobila foloseste un interceptor Axios pentru a detecta raspunsurile `401 Unauthorized`. Daca access tokenul a expirat, clientul foloseste refresh tokenul salvat local pentru a obtine un nou access token, apoi retrimite cererea initiala. Acest mecanism pastreaza sesiunea activa fara a cere utilizatorului sa se autentifice din nou.

## 2.5 Paragraf gata de inclus in lucrare

Pentru o gestionare mai sigura a sesiunilor, aplicatia foloseste un mecanism bazat pe access token si refresh token. Access tokenul are o durata de viata scurta si este folosit pentru autorizarea cererilor catre API, iar refresh tokenul permite obtinerea unui nou access token fara reautentificare. Refresh tokenurile sunt stocate in baza de date doar sub forma de hash si sunt rotite la fiecare utilizare. La logout, backend-ul revoca refresh tokenul si invalideaza access tokenul curent, reducand riscul folosirii unei sesiuni dupa deconectare.

## 3. Directii urmatoare de securitate

Urmatoarele masuri pot fi documentate sau implementate ulterior:

- politici mai stricte pentru parole;
- validarea stricta a webhook-urilor Stripe;
- protectie pentru componentele AI impotriva prompt injection;
- validarea imaginilor si a URL-urilor;
- audit si jurnalizare pentru actiunile importante;
- configurarea stricta CORS in productie.
