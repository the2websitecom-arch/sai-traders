# Sai Traders Firebase Setup

1. Create a Firebase project at `https://console.firebase.google.com`.
2. Add a Web App and copy the Firebase config into `app.js`.
3. Enable Authentication with Email/Password.
4. Create one owner user in Firebase Authentication.
5. Enable Firestore Database.
6. Enable Firebase Storage.
7. Replace `ownerWhatsAppNumber` in `app.js` with your WhatsApp number using country code, for example `919876543210`.

## Firestore Rules

Use these rules so everyone can view properties, but only the logged-in owner can create listings.

```txt
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /properties/{propertyId} {
      allow read: if true;
      allow create: if request.auth != null
        && request.resource.data.ownerId == request.auth.uid;
      allow update, delete: if request.auth != null
        && resource.data.ownerId == request.auth.uid;
    }
  }
}
```

## Storage Rules

```txt
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /properties/{ownerId}/{fileName} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.uid == ownerId;
    }
  }
}
```

## Local Preview

Open `index.html` in a browser to preview the design. Firebase features work after you paste the config and host it through Firebase Hosting or any static web host.
