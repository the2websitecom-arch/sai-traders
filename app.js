import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  addDoc,
  collection,
  getFirestore,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import {
  getDownloadURL,
  getStorage,
  ref,
  uploadBytes
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-storage.js";

const firebaseConfig = {
  apiKey: "PASTE_YOUR_FIREBASE_API_KEY",
  authDomain: "PASTE_YOUR_PROJECT.firebaseapp.com",
  projectId: "PASTE_YOUR_PROJECT_ID",
  storageBucket: "PASTE_YOUR_PROJECT.appspot.com",
  messagingSenderId: "PASTE_YOUR_SENDER_ID",
  appId: "PASTE_YOUR_APP_ID"
};

const ownerWhatsAppNumber = "919999999999";
const fallbackProperties = [
  {
    title: "Premium Highway Facing Land",
    location: "Prime road access",
    area: "2 Acres",
    price: "Contact for price",
    description: "Clear approach road, excellent frontage, and strong future development potential.",
    imageUrls: [
      "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=900&q=80"
    ]
  },
  {
    title: "Residential Plot Near City",
    location: "Fast-growing locality",
    area: "6000 sq.ft",
    price: "Contact for price",
    description: "Ideal for villa development with nearby shops, schools, and transport connectivity.",
    imageUrls: [
      "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=900&q=80"
    ]
  },
  {
    title: "Investment Land Parcel",
    location: "Developing belt",
    area: "1.5 Acres",
    price: "Contact for price",
    description: "Suitable for long-term investment, farmhouse planning, or plotted development.",
    imageUrls: [
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80"
    ]
  }
];

const configured = !Object.values(firebaseConfig).some((value) => value.startsWith("PASTE_"));
const app = configured ? initializeApp(firebaseConfig) : null;
const auth = app ? getAuth(app) : null;
const db = app ? getFirestore(app) : null;
const storage = app ? getStorage(app) : null;

const propertyGrid = document.querySelector("#propertyGrid");
const propertyCount = document.querySelector("#propertyCount");
const loginPanel = document.querySelector("#loginPanel");
const propertyForm = document.querySelector("#propertyForm");
const loginMessage = document.querySelector("#loginMessage");
const publishMessage = document.querySelector("#publishMessage");
const logoutButton = document.querySelector("#logoutButton");
const photosInput = document.querySelector("#photos");
const previewGrid = document.querySelector("#previewGrid");
const whatsappTop = document.querySelector("#whatsappTop");
const whatsappFooter = document.querySelector("#whatsappFooter");

const whatsappBase = `https://wa.me/${ownerWhatsAppNumber}`;
whatsappTop.href = `${whatsappBase}?text=${encodeURIComponent("Hello Sai Traders, I want to know about available land.")}`;
whatsappFooter.href = whatsappTop.href;

function getWhatsAppLink(property) {
  const message = `Hello Sai Traders, I want to buy/enquire about: ${property.title} at ${property.location}.`;
  return `${whatsappBase}?text=${encodeURIComponent(message)}`;
}

function renderProperties(properties) {
  propertyCount.textContent = `${properties.length} listing${properties.length === 1 ? "" : "s"}`;
  propertyGrid.innerHTML = properties
    .map((property) => {
      const image = property.imageUrls?.[0] || fallbackProperties[0].imageUrls[0];
      return `
        <article class="property-card">
          <div class="property-media">
            <img src="${image}" alt="${property.title}" loading="lazy" />
          </div>
          <div class="property-body">
            <h3>${property.title}</h3>
            <p>${property.description}</p>
            <div class="property-meta">
              <span>${property.location}</span>
              <span>${property.area}</span>
              <span>${property.price}</span>
              <span>Verified by owner</span>
            </div>
            <a class="button primary full" href="${getWhatsAppLink(property)}" target="_blank" rel="noopener">
              Buy on WhatsApp
            </a>
          </div>
        </article>
      `;
    })
    .join("");
}

if (configured) {
  const propertyQuery = query(collection(db, "properties"), orderBy("createdAt", "desc"));
  onSnapshot(
    propertyQuery,
    (snapshot) => {
      const properties = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      renderProperties(properties.length ? properties : fallbackProperties);
    },
    () => renderProperties(fallbackProperties)
  );
} else {
  renderProperties(fallbackProperties);
  loginMessage.textContent = "Paste your Firebase config in app.js before using owner login.";
}

if (auth) {
  onAuthStateChanged(auth, (user) => {
    loginPanel.classList.toggle("is-hidden", Boolean(user));
    propertyForm.classList.toggle("is-hidden", !user);
  });
}

loginPanel.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!auth) {
    loginMessage.textContent = "Firebase is not configured yet. Add your config in app.js first.";
    return;
  }

  loginMessage.textContent = "Logging in...";
  try {
    await signInWithEmailAndPassword(
      auth,
      document.querySelector("#ownerEmail").value,
      document.querySelector("#ownerPassword").value
    );
    loginMessage.textContent = "Login successful.";
  } catch (error) {
    loginMessage.textContent = error.message;
  }
});

logoutButton.addEventListener("click", async () => {
  if (auth) {
    await signOut(auth);
  }
});

photosInput.addEventListener("change", () => {
  previewGrid.innerHTML = "";
  [...photosInput.files].slice(0, 8).forEach((file) => {
    const image = document.createElement("img");
    image.src = URL.createObjectURL(file);
    image.alt = file.name;
    previewGrid.append(image);
  });
});

propertyForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!auth?.currentUser || !db || !storage) {
    publishMessage.textContent = "Please login with the owner account after Firebase setup.";
    return;
  }

  const files = [...photosInput.files];
  publishMessage.textContent = "Uploading photos...";

  try {
    const imageUrls = await Promise.all(
      files.map(async (file) => {
        const filePath = `properties/${auth.currentUser.uid}/${Date.now()}-${file.name}`;
        const storageRef = ref(storage, filePath);
        await uploadBytes(storageRef, file);
        return getDownloadURL(storageRef);
      })
    );

    await addDoc(collection(db, "properties"), {
      title: document.querySelector("#title").value.trim(),
      location: document.querySelector("#location").value.trim(),
      area: document.querySelector("#area").value.trim(),
      price: document.querySelector("#price").value.trim(),
      description: document.querySelector("#description").value.trim(),
      imageUrls,
      ownerId: auth.currentUser.uid,
      createdAt: serverTimestamp()
    });

    propertyForm.reset();
    previewGrid.innerHTML = "";
    publishMessage.textContent = "Property published successfully.";
  } catch (error) {
    publishMessage.textContent = error.message;
  }
});
