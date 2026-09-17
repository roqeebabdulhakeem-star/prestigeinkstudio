const params = new URLSearchParams(location.search);
const ref = params.get("ref") || sessionStorage.getItem("prestigeBookingReference");
const booking = JSON.parse(sessionStorage.getItem("prestigeBooking") || "null");

const refEl = document.querySelector("[data-ref]");
const amountEl = document.querySelector("[data-amount]");
const nameEl = document.querySelector("[data-name]");
const expectedMethod = document.body.dataset.method || "";

if (refEl) refEl.textContent = ref || "Not available";
if (amountEl) amountEl.textContent = booking ? `$${Number(booking.depositUsd).toFixed(0)}` : "—";
if (nameEl) nameEl.textContent = booking ? `${booking.firstName} ${booking.lastName}` : "Customer";

function msg(text, type = "") {
  const el = document.getElementById("status");
  if (el) {
    el.textContent = text;
    el.className = `status ${type}`;
  }
}

async function imageToFirestoreData(file, maxBytes = 850 * 1024) {
  if (!file) return null;
  if (!file.type.startsWith("image/")) throw new Error("Please upload an image file.");
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

async function savePaymentImage(file) {
  if (!file) return null;
  if (!window.firebaseFirestore) throw new Error("Firebase Firestore is not configured.");
  const dataUrl = await imageToFirestoreData(file);
  const imageId = `${ref}_payment_${Date.now()}`;
  await window.firebaseSetDoc(window.firebaseFirestoreDoc(window.firebaseFirestore, "bookingImages", imageId), {
    bookingReference: ref,
    type: "payment_proof",
    paymentMethod: expectedMethod,
    fileName: file.name,
    contentType: "image/jpeg",
    dataUrl,
    createdAt: new Date().toISOString()
  });
  return imageId;
}

async function savePayment(update) {
  if (!ref || !window.firebaseDatabase) {
    throw new Error("Firebase is not configured or the booking reference is missing.");
  }
  await window.firebaseUpdate(
    window.firebaseDatabaseRef(window.firebaseDatabase, `bookings/${ref}`),
    {
      ...update,
      paymentUpdatedAt: new Date().toISOString(),
      status: "payment_submitted"
    }
  );
}

const form = document.getElementById("paymentForm");

form?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const btn = form.querySelector("button");
  if (btn) btn.disabled = true;
  msg("");

  try {
    if (!booking || booking.bookingReference !== ref) {
      throw new Error("This booking session could not be verified. Please return to the booking page and start again.");
    }
    if (booking.paymentMethod !== expectedMethod) {
      throw new Error("The selected payment method does not match this booking.");
    }

    const file = form.querySelector('input[type="file"]')?.files?.[0];
    const requiredImage = form.dataset.requireImage === "true";
    if (requiredImage && !file) {
      throw new Error("Please upload the required payment image before submitting.");
    }

    const update = { paymentMethod: expectedMethod };
    if (file) {
      update.paymentProofImageId = await savePaymentImage(file);
    }

    await savePayment(update);

    msg("Payment submitted successfully. Your booking is now awaiting studio verification.", "success");
    form.reset();
  } catch (err) {
    console.error(err);
    msg(err.message || "Could not submit payment information.", "error");
    if (btn) btn.disabled = false;
  }
});
