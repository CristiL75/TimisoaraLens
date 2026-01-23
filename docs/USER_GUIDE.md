# TimisoaraLens - Ghid de Utilizare

## Pași Principali de Utilizare

### Fluxul 1: Utilizator Nou → Explorare Apartamente

| Pas | Acțiune | Ecran | Rezultat |
|-----|---------|-------|----------|
| 1 | Deschide app | Splash Screen | Se verifică token salvat |
| 2 | Apasă "Register" | Register Screen | Form gol pentru înregistrare |
| 3 | Completează email, username, parolă | Register Screen | Validare date în timp real |
| 4 | Apasă "Create Account" | Register Screen | Token JWT primit, navigation la Home |
| 5 | Merge la "Apartments" tab | Home → Listings Screen | Afișează 10 apartamente active |
| 6 | Selectează un apartament | Listings Screen | Navigare la Listing Detail |

**Diagramă flux:**
```
┌─────────────────┐
│ Splash Screen   │
└────────┬────────┘
         │
    ┌────▼─────┐
    │ No Token? │
    └────┬─────┘
         │
  ┌──────▼──────────┐
  │ Login/Register  │
  └──────┬──────────┘
         │
  ┌──────▼────────────────┐
  │ Register Screen       │
  │ (email, user, pass)   │
  └──────┬────────────────┘
         │
  ┌──────▼──────────┐
  │ Home Screen     │
  │ [Apartments]    │
  │ [Map]           │
  │ [Profile]       │
  └──────┬──────────┘
         │
  ┌──────▼──────────────┐
  │ Listings Screen     │
  │ (10 apartamente)    │
  └──────┬──────────────┘
         │
  ┌──────▼──────────────────┐
  │ Listing Detail Screen   │
  │ (Info + Reviews)        │
  └─────────────────────────┘
```

---

### Fluxul 2: Utilizator Autentificat → Adaugă Recenzie

| Pas | Acțiune | Ecran | Rezultat |
|-----|---------|-------|----------|
| 1 | Din Listing Detail → "View Reviews" | Listing Detail | Afișează lista recenzii + rating mediu |
| 2 | Apasă "Add Review" (buton albastru) | Reviews List | Navigare la Add Review Screen |
| 3 | Selectează rating (★★★★★) + scrie titlu/comment | Add Review Screen | Form validare în real-time |
| 4 | Apasă "Submit" | Add Review Screen | POST la `/listings/{id}/reviews` + navigare înapoi |
| 5 | Recenzia apare în lista | Reviews List | Rating mediu se recalculează automat |

**Diagramă flux:**
```
┌──────────────────────────┐
│ Listing Detail Screen    │
│ [View Reviews] button    │
└────────────┬─────────────┘
             │
       ┌─────▼──────────────┐
       │ Reviews List       │
       │ Rating: 4.2/5.0    │
       │ [Add Review]       │
       └─────┬──────────────┘
             │
       ┌─────▼──────────────────┐
       │ Add Review Screen      │
       │ ⭐⭐⭐⭐⭐ (rating)     │
       │ [Title field]          │
       │ [Comment textarea]     │
       │ [Submit]               │
       └─────┬──────────────────┘
             │
    ┌────────▼─────────┐
    │ POST /reviews    │
    │ (backend)        │
    └────────┬─────────┘
             │
    ┌────────▼────────────────┐
    │ Reviews List Updated    │
    │ (4.3/5.0, 19 reviews)   │
    │ (Noua recenzie e acolo) │
    └─────────────────────────┘
```

---

### Fluxul 3: Proprietar → Creează Anunț cu Rută

| Pas | Acțiune | Ecran | Rezultat |
|-----|---------|-------|----------|
| 1 | Apasă "Create" tab | Home | Navigare la Create Listing Screen |
| 2 | Completează form: titlu, descriere, preț, amenities, imagini | Create Listing | Auto-save la AsyncStorage la fiecare schimbare |
| 3 | Apasă "Add Location" | Create Listing | Navigare la Location Picker → GPS sau hartă |
| 4 | Selectează locație → Reverse geocode | Location Picker | Adresa se completează automat |
| 5 | Apasă "Add Route" | Create Listing | Navigare la Route Builder Screen |
| 6 | Caută și selectează 3 locații turistice | Route Builder | Marker-e pe hartă, locații în array |
| 7 | Apasă "Finish" | Route Builder | Ruta salvată în AsyncStorage, navigare înapoi |
| 8 | Apasă "Submit Listing" | Create Listing | POST la `/listings` cu toate datele + ruta |

**Diagramă flux:**
```
┌─────────────┐
│ Home Screen │
│ [Create]    │
└────────┬────┘
         │
  ┌──────▼──────────────────┐
  │ Create Listing Screen   │
  │ Form (auto-save)        │
  │ - Titlu, descriere      │
  │ - Preț, amenities       │
  │ - Imagini               │
  │ [Add Location]          │
  │ [Add Route]             │
  │ [Submit]                │
  └──────┬─────────────────┬┘
         │                 │
    ┌────▼──────────────┐  │
    │ Location Picker   │  │
    │ (GPS/Harta)       │  │
    │ Reverse geocode   │  │
    │ Adresa auto       │  │
    └────┬──────────────┘  │
         │                 │
    ┌────▼──────────────────────┐
    │ Route Builder Screen      │
    │ MapView + Search          │
    │ [Search "Cathedral"]      │
    │ [Add Place] → Marker      │
    │ Repeat 2-3x               │
    │ [Finish Route]            │
    └────┬───────────────────────┘
         │
    ┌────▼──────────────────┐
    │ Back to Create        │
    │ (Route loaded)        │
    └────┬──────────────────┘
         │
    ┌────▼────────────────────┐
    │ POST /listings          │
    │ (all data + route)      │
    └─────────────────────────┘
```

---

### Fluxul 4: Utilizator → Șterge Recenzia

| Pas | Acțiune | Ecran | Rezultat |
|-----|---------|-------|----------|
| 1 | Din Reviews List → Localizează propria recenzie | Reviews List | Recenzia are buton "Delete" roșu |
| 2 | Apasă "Delete" | Reviews List | Alert confirm: "Sure?" |
| 3 | Apasă "Delete" (în dialog) | Reviews List | DELETE `/listings/{id}/reviews/{reviewId}` |
| 4 | Recenzia dispare | Reviews List | Lista se refresh-uiește automat |

**Diagramă flux:**
```
┌────────────────────────┐
│ Reviews List           │
│ [Review 1]             │
│ [Own Review] [Delete]  │ ← Utilizator vede Delete buton
│ [Review 3]             │
└────────┬───────────────┘
         │
  ┌──────▼──────────────┐
  │ Alert Dialog        │
  │ "Delete review?"    │
  │ [Cancel] [Delete]   │
  └──────┬──────────────┘
         │
  ┌──────▼─────────────────┐
  │ DELETE /reviews/{id}   │
  │ (Authorization check)  │
  └──────┬─────────────────┘
         │
  ┌──────▼──────────────────┐
  │ Reviews List Updated    │
  │ (Recenzia ștearsă)      │
  │ Rating mediu updated    │
  │ "Deleted successfully"  │
  └─────────────────────────┘
```

---

---

## Inventar Elemente UI - Descriere și Rol

### Elemente de Navigare

| Element | Tip | Unde | Rol | Comportament |
|---------|-----|------|-----|--------------|
| **Bottom Tab Navigator** | Navigation | În toată app-ul (bottom) | Navigare între secțiuni principale | Highlight tab activ, transition suav |
| **Header Back Button** | Button | Top-left pe fiecare Screen | Navigare înapoi la ecranul anterior | Pop din stack, stare formularelor se păstrează |
| **Stack Navigator** | Navigation | În spatele tab navigator | Gestionează fluxul pe ecrane | Animație slide din dreapta |

**Taburi principale:**
- 🏠 **Home** - Dashboard cu statistici
- 🏢 **Apartments** - Lista apartamente
- ➕ **Create** - Crează anunț nou
- 📍 **Map** - Hartă interactivă
- 👤 **Profile** - Setări utilizator

---

### Elemente de Input

| Element | Tip | Unde | Rol | Validare |
|---------|-----|------|-----|----------|
| **TextInput - Email** | Text Field | Register, Login, Create Listing | Introdu email utilizator | `^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$` |
| **TextInput - Parolă** | Secure Field | Register, Login | Introdu parolă (masked) | Min 6 chars, regex pentru caractere speciale |
| **TextInput - Username** | Text Field | Register | Unic username | 3-20 chars, alphanumeric + underscore |
| **TextInput - Titlu Anunț** | Text Field | Create Listing | Titlu apartament | 5-100 chars |
| **TextInput - Descriere** | TextArea | Create Listing, Add Review | Text lung cu multiple linii | Max 500 chars |
| **Picker/Dropdown - Property Type** | Dropdown | Create Listing | Selectează tip proprietate | Opțiuni: "Apartment", "House", "Studio" |
| **Slider - Preț/Guests** | Slider | Create Listing | Selectează numeric cu slide | 1-500 RON, 1-20 persoane |
| **Checkbox Array - Amenities** | Checkboxes | Create Listing | Selectează multiple amenities | Toggle on/off, array se actualizează |
| **Star Rating - Review** | Custom Component | Add Review | Rating 1-5 stele | Tap pe stea selectează rating |

**Exemplu validare în real-time:**
```
TextInput Email
  ↓
onChange event
  ↓
Regex validation
  ↓
Display error/success
  ↓
Enable/disable submit button
```

---

### Elemente de Afișare Dată

| Element | Tip | Unde | Rol | Format |
|---------|-----|------|-----|--------|
| **Text - Titlu** | Typography | Peste tot | Heading principal | Bold, 18-20px, negru |
| **Text - Subtitle** | Typography | Peste tot | Descriere secundară | Regular, 14px, gri (#666) |
| **Card Component** | Container | Listings List, Reviews List | Container pentru item | Elevation shadow, rounded corners |
| **Rating Badge** | Visual | Listing Detail, Reviews List | Afișează ⭐ + score | Ex: "4.2/5.0 (18 reviews)" |
| **Image Component** | Image Display | Listing Detail, Create Listing | Afișează imagini de apartament | Aspect ratio 4:3, click pentru full-screen |
| **Location Text** | Text | Listing Detail, Create Listing | Adresa din reverse geocode | Gri, iconiță location |
| **List View / FlatList** | Scrollable List | Listings Screen, Reviews Screen | Lista de apartamente/recenzii | Pagination: load 10 items la scroll |
| **Price Badge** | Highlighted Text | Listing Card | Preț per noapte | Bold, culoare accentuată (de obicei albastru) |
| **Status Indicator** | Dot/Badge | Listing Card | Active/Inactive status | Verde = active, Gri = inactive |

---

### Elemente de Acțiune (Buttons)

| Element | Tip | Unde | Rol | State |
|---------|-----|------|-----|-------|
| **Primary Button - Register/Login** | Filled Button | Register, Login Screen | Trimite form | Disabled dacă form incomplete |
| **Secondary Button - Cancel/Back** | Outlined Button | Peste tot | Anuleaza acțiune | Pop navigation sau reset form |
| **FAB - Create Listing** | Floating Action Button | Listings Screen | Quick access la create | Always visible, rotate animation |
| **Delete Button** | Danger Button (Red) | Reviews List, Listing Detail | Șterge review/anunț | Requires confirmation dialog |
| **Edit Button** | Secondary Button | Reviews List (own review) | Editeaza review | Navigate la edit form |
| **Add to Favorites** | Icon Button | Listing Detail | Mark as favorite | Heart icon, toggle fill/outline |
| **Share Button** | Icon Button | Listing Detail | Share listing link | Native share sheet |
| **GPS Button** | Icon Button | Location Picker | Get current location | Loading spinner când activ |
| **Submit Button** | Primary Filled | Create Listing, Add Review | Trimite form complet | Disabled până form valid |

**Button States:**
```
┌─────────────────────────────┐
│ Normal State (enabled)      │
│ [Submit] (filled, touchable)│
└──────────┬──────────────────┘
           │
      ┌────┴────┐
      ▼         ▼
  Pressed    Disabled
  (ripple)   (grayed out)
```

---

### Elemente de Feedback Utilizator

| Element | Tip | Unde | Rol | Apariție |
|---------|-----|------|-----|----------|
| **Loading Spinner** | Spinner | La fiecare network request | Indică loading | Apare la POST/GET/DELETE |
| **Toast Notification** | Snackbar | Bottom screen | Notificare scurtă (1-2 sec) | Succes: "Review added!", Eroare: "Network error" |
| **Dialog / Alert** | Modal | Peste tot | Confirmare/eroare importantă | Click outside nu close, trebuie buton |
| **Empty State** | Illustration + Text | Listings/Reviews gol | Mesaj când nu-s date | "No apartments found", cu icon |
| **Error Message** | Red text | Sub input field | Validare în real-time | "Email invalid", "Min 6 characters" |
| **Success Checkmark** | Green icon + text | După submit form | Confirmare completare | Apare 2 sec, apoi navigation |
| **Progress Indicator** | Linear Bar | Upload imagini | Arată % progres | "2/5 images uploaded" |

**Exemplu Toast:**
```
┌─────────────────────────┐
│ ✅ Review added!        │
│ (bottom, 2-3 sec)       │
└─────────────────────────┘
```

---

### Elemente de Hartă și Locație

| Element | Tip | Unde | Rol | Interacțiune |
|---------|-----|------|-----|--------------|
| **MapView Component** | Native Map | Location Picker, Route Builder | Afișează hartă interactivă | Pan, zoom, pinch gestures |
| **Marker** | Map Overlay | MapView | Pin pe hartă pentru locații | Tap → callout, long-press → drag, double-tap → info |
| **Polyline** | Map Overlay | Route Builder | Linie între locații (optional) | Visual aid pentru traseu |
| **Callout / Popup** | InfoBox | Pe Marker | Info despre locație | Auto-close la tap out, can contain buttons |
| **Search Input - Places** | Text Field + List | Route Builder | Caută locații Nominatim | Dropdown cu rezultate sub input |

**Exemplu interacțiune Marker:**
```
User taps Marker
    ↓
Callout apare
    ↓
┌──────────────────┐
│ Cathedral        │
│ Piața Unirii     │
│ [Select]         │
└──────────────────┘
```

---

### Elemente de Form Management

| Element | Tip | Unde | Rol | Comportament |
|---------|-----|------|-----|--------------|
| **Form Progress Indicator** | Progress Bar | Create Listing (optional) | Arată câte step-uri done | Visual cue de progres (20%, 40%, etc) |
| **Stepper / Tab List** | Navigation | Create Listing (future) | Separă form în etape | Click pe tab → scroll la section |
| **Save Draft Toggle** | Toggle Switch | Create Listing | Auto-save or manual | Enabled by default, data în AsyncStorage |
| **Validation Summary** | Error List | Bottom form | Listează toate erorile | Red icon + text, click = scroll to field |

**Exemplu Progress Create Listing:**
```
Step 1: Info (25%) ████░░░░░░ ← current
Step 2: Location (50%) █████████░
Step 3: Route (75%) ██████████░
Step 4: Review (100%) ████████████
```

---

### Elemente de Gestionare Conținut

| Element | Tip | Unde | Rol | Funcție |
|---------|-----|------|-----|---------|
| **Image Picker Button** | Button + ActionSheet | Create Listing | Selectează imagini | Opens camera/gallery, allows multiple |
| **Image Thumbnail Grid** | Grid View | Create Listing, Listing Detail | Afișează imagini selected | Tap pentru full-screen, swipe pt delete |
| **Delete Image (X Button)** | Icon Button | Pe thumbnail | Șterge imagine | Immediate remove din array |
| **Gallery Fullscreen Viewer** | Modal | Tap pe image | Fullscreen swipe-able gallery | Pinch-to-zoom, navigation indicators |
| **Upload Progress** | Progress Circle | În ImagePicker | Arată % upload | "Uploading 2/5 images..." |

**Exemplu Image Picker ActionSheet:**
```
┌──────────────────────┐
│ Select Image Source  │
├──────────────────────┤
│ 📷 Camera            │
│ 🖼️  Photo Gallery     │
│ ✖️  Cancel            │
└──────────────────────┘
```

---

## Arhitectura Interacțiunilor

### State Management Flow

```
User Interaction
    ↓
Handler Function (onClick, onChange)
    ↓
Update State (useState)
    ↓
Validate Input
    ↓
Display Feedback (error/success)
    ↓
API Call (dacă valid)
    ↓
Backend Processing
    ↓
Response
    ↓
Update UI + Navigate
```

### Data Flow Exemple

**Exemplu 1: Register**
```
User Input → TextInputs
    ↓
[Register Button] → handleRegister()
    ↓
Validation (Regex)
    ↓
POST /auth/register {email, username, password}
    ↓
Backend: Hash password + Save to MongoDB
    ↓
Response: {access_token, user_id}
    ↓
AsyncStorage.setItem('userToken', token)
    ↓
AuthContext.signIn()
    ↓
Navigate to Home Screen
```

**Exemplu 2: Add Review**
```
Add Review Screen: rating + title + comment
    ↓
[Submit Button] → handleSubmit()
    ↓
Validation (rating 1-5, title min 5 chars)
    ↓
Loading Spinner ON
    ↓
POST /listings/{id}/reviews {rating, title, comment}
    ↓
Header: Authorization: Bearer {JWT_TOKEN}
    ↓
Backend: Check if user already reviewed
    ↓
Backend: Insert to MongoDB.reviews
    ↓
Response: {id, status: "created"}
    ↓
Loading Spinner OFF
    ↓
Toast: "Review added!"
    ↓
navigation.goBack()
    ↓
ReviewsListScreen: fetchReviews() triggered
    ↓
Updated list displayed
```

---

## Accessibility & Best Practices

### Keyboard Navigation
- Tab through inputs in logical order
- Enter/Return submit form
- Escape cancel dialog

### Touch Targets
- Minimum 48x48 dp pentru buttons/touchable areas
- Adequate spacing (16dp minimum) între interactivi elements

### Color Contrast
- Text: 4.5:1 ratio (WCAG AA standard)
- Icons: Same contrast requirements
- Avoid color-only differentiation (use icons/text too)

### Screen Reader Friendly
- Descriptive labels pe toate inputs
- accessibilityLabel prop pe buttons
- accessibilityHint pe complex interactions

---

## Notă pentru Designeri

Poți adăuga:
- ✏️ Wireframes pentru fiecare ecran
- 🎨 Hi-fi mockups cu culori actuale
- 📹 GIF-uri cu animații
- 🎬 Screenshots din app actual

**Placeholder locations:**
```
docs/images/
├── flow-1-register.png
├── flow-2-add-review.png
├── flow-3-create-listing.png
├── flow-4-delete-review.png
├── ui-elements-buttons.png
├── ui-elements-inputs.png
├── ui-elements-maps.png
└── accessibility-guide.png
```

Poi insera cu: `![Description](../images/filename.png)`
