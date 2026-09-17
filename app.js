const form = document.getElementById("bookingForm");
const deposit = document.getElementById("deposit");
const summaryDeposit = document.getElementById("summaryDeposit");
const summaryTotal = document.getElementById("summaryTotal");
const buttonAmount = document.getElementById("buttonAmount");
const payButton = document.getElementById("payButton");
const statusEl = document.getElementById("status");
const reference = document.getElementById("reference");
const fileName = document.getElementById("fileName");
const dateInput = document.getElementById("date");
const paymentMethod = document.getElementById("paymentMethod");

if (dateInput) dateInput.min = new Date(Date.now() + 86400000).toISOString().split("T")[0];

function updateAmount() {
  const amount = Number(deposit?.value || 0);
  const formatted = `$${amount.toFixed(0)}`;
  if (summaryDeposit) summaryDeposit.textContent = formatted;
  if (summaryTotal) summaryTotal.textContent = formatted;
  if (buttonAmount) buttonAmount.textContent = formatted;
}
deposit?.addEventListener("change", updateAmount);
updateAmount();

paymentMethod?.addEventListener("change", () => {
  const summaryMethod = document.getElementById("summaryMethod");
  if (summaryMethod) summaryMethod.textContent = paymentMethod.value || "Select below";
});

reference?.addEventListener("change", () => {
  if (fileName) fileName.textContent = reference.files[0]?.name || "No image selected";
});

function setStatus(message, type = "") {
  if (!statusEl) return;
  statusEl.textContent = message;
  statusEl.className = `status ${type}`;
}

function makeReference() {
  return `PI-${Date.now()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
}

// Firestore has a 1 MiB document limit. Compress reference images into a
// JPEG data URL below ~850 KB and store them in Firestore, not Firebase Storage.
async function imageToFirestoreData(file, maxBytes = 850 * 1024) {
  if (!file) return null;
  if (!file.type.startsWith("image/")) throw new Error("Please upload a PNG, JPG, or WEBP image.");
  if (file.size > 12 * 1024 * 1024) throw new Error("Image must be 12MB or smaller before compression.");

  const bitmap = await createImageBitmap(file);
  const maxDimension = 1800;
  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext("2d", { alpha: false });
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  let quality = 0.82;
  let dataUrl = canvas.toDataURL("image/jpeg", quality);
  while (dataUrl.length * 0.75 > maxBytes && quality > 0.35) {
    quality -= 0.07;
    dataUrl = canvas.toDataURL("image/jpeg", quality);
  }

  if (dataUrl.length * 0.75 > maxBytes) {
    throw new Error("The image is still too large after compression. Please choose a smaller image.");
  }
  return dataUrl;
}

async function saveImageToFirestore({ bookingRef, type, file }) {
  if (!file) return null;
  if (!window.firebaseFirestore) throw new Error("Firebase Firestore is not configured.");
  const dataUrl = await imageToFirestoreData(file);
  const imageId = `${bookingRef}_${type}`;
  await window.firebaseSetDoc(window.firebaseFirestoreDoc(window.firebaseFirestore, "bookingImages", imageId), {
    bookingReference: bookingRef,
    type,
    fileName: file.name,
    contentType: "image/jpeg",
    dataUrl,
    createdAt: new Date().toISOString()
  });
  return imageId;
}

form?.addEventListener("submit", async (event) => {
  event.preventDefault();
  setStatus("");

  if (!window.firebaseDatabase || !window.firebaseFirestore) {
    setStatus("Firebase is not configured correctly. Please check your Firebase setup.", "error");
    return;
  }

  const data = {
    firstName: document.getElementById("firstName").value.trim(),
    lastName: document.getElementById("lastName").value.trim(),
    email: document.getElementById("email").value.trim(),
    phone: document.getElementById("phone").value.trim(),
    style: document.getElementById("style").value,
    placement: document.getElementById("placement").value.trim(),
    size: document.getElementById("size").value,
    date: document.getElementById("date").value,
    time: document.getElementById("time").value,
    depositUsd: Number(deposit.value),
    description: document.getElementById("description").value.trim(),
    paymentMethod: paymentMethod.value,
    createdAt: new Date().toISOString(),
    status: "awaiting_payment"
  };

  const allowedDeposits = [100, 200, 400];
  const allowedPaymentMethods = ["Apple Card", "Wire Transfer", "Bitcoin"];

  if (!allowedDeposits.includes(data.depositUsd)) {
    setStatus("Please select a valid booking amount.", "error");
    return;
  }
  if (!allowedPaymentMethods.includes(data.paymentMethod)) {
    setStatus("Please select a valid payment method.", "error");
    return;
  }
  if (!data.date || !data.time) {
    setStatus("Please select your preferred date and time.", "error");
    return;
  }

  const bookingRef = makeReference();
  payButton.disabled = true;
  payButton.querySelector("span").textContent = "SAVING BOOKING...";

  try {
    data.bookingReference = bookingRef;

    const referenceFile = reference?.files?.[0];
    if (referenceFile) {
      data.referenceImageId = await saveImageToFirestore({
        bookingRef,
        type: "tattoo_reference",
        file: referenceFile
      });
    }

    await window.firebaseSet(window.firebaseDatabaseRef(window.firebaseDatabase, `bookings/${bookingRef}`), data);

    sessionStorage.setItem("prestigeBooking", JSON.stringify(data));
    sessionStorage.setItem("prestigeBookingReference", bookingRef);

    const pages = {
      "Apple Card": "apple-card.html",
      "Wire Transfer": "wire-transfer.html",
      "Bitcoin": "bitcoin.html"
    };
    window.location.href = `${pages[data.paymentMethod]}?ref=${encodeURIComponent(bookingRef)}`;
  } catch (error) {
    console.error(error);
    setStatus(error.message || "Could not save your booking. Please try again.", "error");
    payButton.disabled = false;
    payButton.querySelector("span").textContent = "CONTINUE TO PAYMENT";
  }
});
