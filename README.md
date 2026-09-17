# Prestige Ink Studio Booking

Firebase-connected booking flow with exactly three payment methods:
- Apple Card
- Wire Transfer
- Bitcoin

Paystack is not included.

## Firebase configuration already added

The supplied Firebase Web App configuration has been placed in `firebase-config.js`.

The app uses:
- Firebase Realtime Database for booking/payment records
- Cloud Firestore for reference images and payment proofs

## Firebase Console setup

In Firebase Console for project `tattoo-90e69`:

1. Create/enable **Realtime Database**.
2. Create/enable **Storage**.
3. Deploy `database.rules.json` as your Realtime Database rules.
4. Deploy `storage.rules` as your Storage rules.
5. If the Realtime Database was created in a different region/URL, replace `databaseURL` in `firebase-config.js` with the exact URL shown in Firebase Console.
6. Replace the placeholder Bitcoin wallet address in `bitcoin.html` with the studio's verified wallet address.

## Important security note

Firebase Web App configuration values such as `apiKey` and `appId` are not private server secrets. Never place Firebase Admin SDK credentials, service-account private keys, or other server secrets in frontend files.

The Apple Card page deliberately does not collect a full card number, expiration date, PIN, or CVV.

## Run locally

```bash
npm install
npm start
```

Then open `http://localhost:3000`.

For deployment, upload the site files to your hosting provider and configure Firebase rules in the Firebase Console.


## Image storage update
- Tattoo reference images are compressed in the browser and stored as JPEG data URLs in the Firestore `bookingImages` collection.
- Apple Gift Card payment requires an image upload.
- Wire Transfer requires an image of the payment receipt.
- Bitcoin requires an image of the completed payment/receipt screen.
- Payment reference, transaction hash, and payment confirmation text fields have been removed.
- Firebase Storage is not used by the website.

Deploy `firestore.rules` to Firestore before testing uploads.
