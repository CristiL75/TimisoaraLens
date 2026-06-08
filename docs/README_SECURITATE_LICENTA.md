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

## 3. Limitarea traficului

Aplicatia include un mecanism de limitare a traficului pentru a preveni suprasolicitarea backend-ului si pentru a reduce riscul de abuz asupra rutelor sensibile. Limitarea traficului este importanta mai ales pentru functionalitati care pot consuma resurse ridicate, cum sunt autentificarea, asistentul conversational si sistemul RAG.

In implementarea existenta, backend-ul aplica limite diferite in functie de tipul rutei:

- rutele de autentificare au o limita mai stricta, pentru reducerea riscului de atacuri brute-force;
- ruta pentru asistentul de rezervari are o limita separata, deoarece implica procesare conversationala si poate apela componente AI;
- ruta RAG are propria limita, pentru a preveni utilizarea excesiva a cautarii semantice si a generarii de raspunsuri;
- restul rutelor folosesc o limita implicita.

## 3.1 Implementare in proiect

Fisier: `backend/main.py`

```python
def _route_bucket_and_limit(self, path: str) -> tuple[str, int]:
    normalized = (path or "").lower()
    if normalized.startswith("/api/auth/login"):
        return "auth", self.auth_limit
    if normalized.startswith("/api/bookings/assistant"):
        return "assistant", self.assistant_limit
    if normalized.startswith("/api/rag/query"):
        return "rag", self.rag_limit
    return "default", self.default_limit
```

## 3.2 Explicatie

Acest fragment grupeaza cererile in categorii diferite si aplica limite specifice fiecarei categorii. Rutele de login sunt tratate separat pentru a preveni incercarile repetate de ghicire a parolei. Rutele pentru RAG si asistentul conversational sunt limitate deoarece pot consuma resurse externe, precum apeluri catre modele AI sau cautari in baze vectoriale.

## 3.3 Protectie contra brute-force

Atacurile de tip brute-force presupun trimiterea unui numar mare de incercari de autentificare pentru a ghici parola unui cont. Prin limitarea cererilor catre ruta de login, aplicatia reduce numarul de incercari posibile intr-un interval scurt de timp. Aceasta masura nu inlocuieste politicile de parole puternice, dar contribuie la reducerea riscului.

## 3.4 Protectie contra abuzului de resurse AI

Componentele AI pot fi mai costisitoare decat rutele obisnuite, deoarece pot implica generare de text, clasificare de intentii, cautare semantica sau apeluri catre servicii externe. Limitarea traficului pentru `/api/rag/query` si `/api/bookings/assistant` previne folosirea excesiva a acestor functionalitati si ajuta la mentinerea stabilitatii sistemului.

## 3.5 Directie de productie: Redis pentru rate limiting distribuit

Mecanismul actual este potrivit pentru o instanta simpla de backend, deoarece limitele sunt pastrate in memoria procesului. Intr-un mediu de productie cu mai multe instante, o imbunatatire ar fi folosirea Redis pentru stocarea contorilor de rate limiting. Redis ar permite partajarea limitelor intre toate instantele backend-ului si ar oferi un comportament consecvent indiferent de serverul care proceseaza cererea.

## 3.6 Paragraf gata de inclus in lucrare

Pentru protejarea aplicatiei impotriva suprasolicitarii si a utilizarii abuzive, backend-ul implementeaza un mecanism de limitare a traficului. Rutele sensibile sunt tratate diferentiat: autentificarea are o limita dedicata pentru reducerea riscului de atacuri brute-force, iar rutele asociate componentelor AI, precum asistentul conversational si RAG, au limite separate pentru a preveni consumul excesiv de resurse. In productie, mecanismul poate fi extins prin utilizarea Redis, astfel incat limitele sa fie partajate intre mai multe instante ale backend-ului.

## 4. Directii urmatoare de securitate

## 4. Protectia componentelor AI

Componentele AI ale aplicatiei includ chatbot-ul RAG si asistentul conversational pentru rezervari. Deoarece aceste componente proceseaza text liber introdus de utilizator, ele necesita masuri suplimentare de protectie fata de endpoint-urile clasice.

Masurile integrate in proiect sunt:

- limitarea lungimii intrebarilor trimise catre chatbot si asistent;
- filtrarea unor instructiuni abuzive sau tentative de prompt injection;
- evitarea logarii mesajului complet al utilizatorului;
- folosirea unui fingerprint pentru loguri, astfel incat cererea sa poata fi urmarita tehnic fara expunerea textului;
- pastrarea istoricului conversatiei intr-o forma limitata si trunchiata;
- returnarea surselor RAG impreuna cu raspunsul, pentru transparenta;
- instructiuni interne in asistentul de rezervari care trateaza mesajul utilizatorului ca date, nu ca instructiuni.

## 4.1 Limitarea lungimii intrebarilor

Fisier: `backend/api/rag.py`

```python
MAX_RAG_QUERY_CHARS = int(os.getenv("MAX_RAG_QUERY_CHARS", "800"))

def _validate_ai_input(query: str) -> str:
    normalized_query = (query or "").strip()
    if not normalized_query:
        raise HTTPException(status_code=400, detail="Query is required.")
    if len(normalized_query) > MAX_RAG_QUERY_CHARS:
        raise HTTPException(
            status_code=413,
            detail=f"Query is too long. Maximum allowed length is {MAX_RAG_QUERY_CHARS} characters.",
        )
    return normalized_query
```

### Explicatie

Prin limitarea lungimii intrebarilor, backend-ul previne trimiterea unor prompturi foarte mari catre serviciile AI. Aceasta masura reduce consumul de resurse, limiteaza costurile si scade riscul de abuz.

## 4.2 Filtrarea inputului abuziv si protectia contra prompt injection

Fisier: `backend/api/rag.py`

```python
ABUSIVE_INPUT_PATTERNS = [
    r"\b(ignore|disregard)\s+(all\s+)?(previous|prior)\s+(instructions|rules)\b",
    r"\b(reveal|show|print|display)\s+(the\s+)?(system|developer)\s+(prompt|message|instructions)\b",
    r"\b(system\s+prompt|developer\s+message|hidden\s+instructions)\b",
    r"\b(jailbreak|dan\s+mode|do\s+anything\s+now)\b",
]
```

### Explicatie

Aceste expresii detecteaza cereri care incearca sa forteze modelul sa ignore instructiunile interne, sa afiseze promptul de sistem sau sa intre intr-un mod de tip jailbreak. In astfel de cazuri, backend-ul respinge cererea inainte ca aceasta sa ajunga la serviciul AI.

## 4.3 Loguri fara date personale sensibile

Fisier: `backend/api/rag.py`

```python
def _query_fingerprint(query: str) -> str:
    return hashlib.sha256((query or "").encode("utf-8")).hexdigest()[:12]
```

Fisier: `backend/api/bookings.py`

```python
def _assistant_message_fingerprint(message: str) -> str:
    return hashlib.sha256((message or "").encode("utf-8")).hexdigest()[:12]
```

### Explicatie

In loc sa logheze intrebarea completa, backend-ul genereaza un identificator scurt pe baza hash-ului mesajului. Astfel, dezvoltatorul poate urmari tehnic o cerere in loguri, fara a expune nume, emailuri, telefoane sau alte date personale pe care utilizatorul le poate introduce in conversatie.

## 4.4 Raspunsuri bazate pe surse RAG

Serviciul RAG nu genereaza raspunsul doar pe baza modelului AI. Intrebarea este transformata intr-un embedding, sunt cautate documente relevante in Qdrant, iar raspunsul este construit pe baza contextului gasit. Raspunsul returnat catre aplicatia mobila include si lista de surse.

Fisier: `hf-space-rag/app.py`

```python
sources.append({
    "rank": i,
    "score": float(score),
    "heading": payload.get("heading", "N/A"),
    "source": payload.get("source", "N/A"),
    "snippet": payload.get("text", "")[:200] + "...",
})
```

### Explicatie

Returnarea surselor permite verificarea informatiilor folosite de chatbot si reduce dependenta de raspunsuri generate exclusiv de model. In interfata mobila, aceste surse sunt afisate sub raspunsul chatbot-ului.

## 4.5 Paragraf gata de inclus in lucrare

Pentru securizarea componentelor AI, aplicatia limiteaza lungimea intrebarilor, filtreaza cererile care contin instructiuni abuzive si evita logarea textului complet introdus de utilizator. In locul mesajului original, backend-ul salveaza in loguri un fingerprint generat prin hash, reducand riscul de expunere a datelor personale. De asemenea, raspunsurile chatbot-ului sunt construite pe baza surselor identificate prin sistemul RAG, nu doar pe baza modelului AI, ceea ce creste transparenta si controlul asupra informatiilor generate.

## 5. Directii urmatoare de securitate

## 5. Audit logging

Pentru actiunile importante ale aplicatiei a fost adaugat un mecanism simplu de audit logging. Scopul acestuia este de a inregistra evenimente relevante pentru securitate si operare, fara a salva date sensibile precum parole, tokenuri, date bancare sau secrete.

Evenimentele urmarite includ:

- autentificari reusite si esuate;
- refresh token reusit sau esuat;
- logout;
- rezervari create;
- rezervari anulate;
- confirmarea sau respingerea rezervarilor;
- cereri de apartament create, acceptate, respinse sau anulate;
- erori Stripe in fluxurile de creare, capturare sau anulare a platilor.

## 5.1 Implementare in proiect

Fisier: `backend/audit.py`

```python
SENSITIVE_KEYS = {
    "password",
    "hashed_password",
    "token",
    "access_token",
    "refresh_token",
    "authorization",
    "payment_method_id",
    "stripe_client_secret",
    "client_secret",
    "card",
    "secret",
}

def audit_log(event: str, **fields: Any) -> None:
    safe_fields = {key: _safe_value(key, value) for key, value in fields.items()}
    logger.info("%s %s", event, safe_fields)
```

## 5.2 Explicatie

Helperul `audit_log` sanitizeaza automat campurile transmise. Daca numele unui camp contine termeni sensibili, valoarea este inlocuita cu `[redacted]`. Pentru emailuri, sistemul foloseste un hash scurt, astfel incat evenimentele pot fi corelate tehnic fara expunerea adresei reale.

## 5.3 Exemple de utilizare

Fisier: `backend/api/auth.py`

```python
audit_log(
    "auth.login.success",
    user_id=str(user["_id"]),
    username=user["username"],
    email=user.get("email"),
)
```

Fisier: `backend/api/bookings.py`

```python
audit_log(
    "booking.created",
    booking_id=str(result.inserted_id),
    provider_id=request.provider_id,
    user_id=current_user.get("id") if current_user else None,
    booking_date=request.booking_date,
)
```

Fisier: `backend/api/apartment_bookings.py`

```python
audit_log(
    "apartment_booking.accepted",
    request_id=req_id,
    listing_id=doc.get("listing_id"),
    owner_user_id=str(current_user["_id"]),
    guest_user_id=doc.get("guest_user_id"),
)
```

## 5.4 Paragraf gata de inclus in lucrare

Pentru cresterea trasabilitatii actiunilor importante, aplicatia foloseste un mecanism de audit logging. Acesta inregistreaza evenimente precum autentificari, refresh de sesiune, logout, creare sau anulare de rezervari si actiuni asupra cererilor de apartament. Mecanismul este proiectat astfel incat sa nu salveze informatii sensibile in loguri: parolele, tokenurile, secretele, identificatorii de plata si datele bancare sunt mascate automat, iar emailurile sunt transformate in hash-uri scurte.

## 6. Securitatea bazei de date

Aplicatia foloseste MongoDB pentru stocarea utilizatorilor, listarilor, rezervarilor, providerilor si datelor asociate sesiunilor. Accesul la baza de date este realizat exclusiv prin backend-ul FastAPI; aplicatia mobila nu se conecteaza direct la MongoDB. Aceasta separare reduce riscul expunerii bazei de date si permite aplicarea validarilor si regulilor de autorizare in backend.

## 6.1 Conexiune prin variabila de mediu

Fisier: `backend/database_mongo.py`

```python
def _load_mongodb_url() -> str:
    configured_url = os.getenv("MONGODB_URL")
    if configured_url:
        return configured_url
    if _is_production_env():
        raise RuntimeError("MONGODB_URL must be set in production.")
    return DEFAULT_MONGODB_URL
```

### Explicatie

In mediul local, aplicatia poate folosi o conexiune implicita catre MongoDB local. In productie, insa, backend-ul refuza pornirea daca `MONGODB_URL` nu este setat explicit. Astfel, se evita folosirea accidentala a unei configurari locale sau nesigure in mediul public.

## 6.2 Masuri de configurare recomandate

Pentru MongoDB Atlas sau orice baza de date MongoDB folosita in productie, sunt recomandate urmatoarele masuri:

- folosirea unui utilizator dedicat aplicatiei, cu permisiuni minime;
- configurarea `MONGODB_URL` doar prin variabile de mediu;
- activarea IP allowlist pentru a permite accesul doar din infrastructura autorizata;
- activarea backup-urilor periodice;
- evitarea expunerii directe a bazei de date catre clientul mobil;
- evitarea afisarii URI-ului complet in loguri;
- folosirea unei conexiuni securizate furnizate de platforma MongoDB Atlas.

## 6.3 Indexuri pentru performanta si consistenta

In proiect sunt create indexuri pentru campuri folosite frecvent, precum email, username, user_id, status, provider_id, date de rezervare, id-uri de cereri si tokenuri de sesiune. Aceste indexuri ajuta la cresterea performantei interogarilor si la aplicarea unor constrangeri, cum este unicitatea emailului sau a username-ului.

Fisier: `backend/database_mongo.py`

```python
await database.users.create_index("email", unique=True)
await database.users.create_index("username", unique=True)
await database.listings.create_index("user_id")
await database.bookings.create_index([("provider_id", 1), ("booking_date", 1)])
await database.apartment_booking_requests.create_index("stripe_payment_intent_id")
await database.refresh_tokens.create_index("token_hash", unique=True)
```

## 6.4 Paragraf gata de inclus in lucrare

Securitatea bazei de date este asigurata prin intermedierea accesului de catre backend si prin configurarea conexiunii prin variabile de mediu. Aplicatia mobila nu comunica direct cu MongoDB, ci trimite cereri catre API-ul FastAPI, care valideaza datele si verifica drepturile utilizatorilor. In productie, conexiunea `MONGODB_URL` trebuie setata explicit, iar baza de date trebuie protejata prin utilizatori cu permisiuni minime, IP allowlist si backup-uri periodice. De asemenea, proiectul defineste indexuri pentru campurile accesate frecvent, precum email, username, user_id, status si identificatori de rezervari.

## 7. HTTPS si security headers

Pentru protejarea comunicarii dintre client si backend, aplicatia trebuie rulata prin HTTPS in productie. In plus, backend-ul seteaza header-e de securitate care reduc riscul unor atacuri comune la nivel web, precum interpretarea gresita a continutului, incarcarea aplicatiei in iframe-uri neautorizate sau expunerea excesiva a informatiilor prin referrer.

## 7.1 Implementare in proiect

Fisier: `backend/main.py`

```python
SECURITY_HEADERS_ENABLED = _env_bool("SECURITY_HEADERS_ENABLED", True)
FORCE_HTTPS = _env_bool("FORCE_HTTPS", _is_production_env())

@app.middleware("http")
async def security_headers_middleware(request, call_next):
    if FORCE_HTTPS:
        forwarded_proto = (request.headers.get("x-forwarded-proto") or "").split(",", 1)[0].strip()
        request_scheme = forwarded_proto or request.url.scheme
        if request_scheme == "http":
            https_url = request.url.replace(scheme="https")
            return RedirectResponse(str(https_url), status_code=307)

    response = await call_next(request)
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("X-Frame-Options", "DENY")
    response.headers.setdefault("Content-Security-Policy", CONTENT_SECURITY_POLICY)
    if FORCE_HTTPS:
        response.headers.setdefault("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
    return response
```

## 7.2 Header-e configurate

- `Strict-Transport-Security`: indica browserului sa foloseasca HTTPS pentru cererile viitoare.
- `X-Content-Type-Options: nosniff`: previne interpretarea gresita a tipului de continut.
- `X-Frame-Options: DENY`: reduce riscul de clickjacking prin blocarea incarcarii in iframe.
- `Content-Security-Policy`: limiteaza sursele din care pot fi incarcate resurse web.
- `Referrer-Policy`: limiteaza informatiile transmise prin header-ul `Referer`.
- `Permissions-Policy`: dezactiveaza implicit accesul browserului la functionalitati sensibile precum camera, microfonul si geolocatia pentru contextul web.

## 7.3 Dezactivarea reload-ului in productie

Fisier: `backend/main.py`

```python
reload_enabled = _env_bool("UVICORN_RELOAD", not _is_production_env())
uvicorn.run(
    "main:app",
    host=host,
    port=port,
    reload=reload_enabled
)
```

### Explicatie

In mediul local, `reload` este util deoarece reporneste automat serverul la modificarea codului. In productie, acesta trebuie dezactivat pentru stabilitate si pentru a evita comportamente nedorite. Implementarea activeaza reload-ul implicit doar in dezvoltare, iar in productie il dezactiveaza automat.

## 7.4 Paragraf gata de inclus in lucrare

Pentru securizarea comunicarii web, backend-ul aplica redirect catre HTTPS in productie si seteaza header-e de securitate precum `Strict-Transport-Security`, `X-Content-Type-Options` si `Content-Security-Policy`. Aceste masuri reduc riscul de acces prin conexiuni nesecurizate, clickjacking sau incarcare de resurse neautorizate. De asemenea, modul de reload al serverului Uvicorn este dezactivat automat in productie, fiind pastrat doar pentru mediul de dezvoltare.

## 8. Directii urmatoare de securitate

Urmatoarele masuri pot fi documentate sau implementate ulterior:

- politici mai stricte pentru parole;
- validarea stricta a webhook-urilor Stripe;
- validarea imaginilor si a URL-urilor;
- audit si jurnalizare pentru actiunile importante;
- configurarea stricta CORS in productie.
