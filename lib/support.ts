/**
 * Everything the "Buy me a coffee?" page needs, in one place.
 *
 * The QR in `UPI_QR_SRC` is the one thing that has to be right: it is what
 * people actually scan. It renders `object-contain` inside a square, so any
 * size, aspect ratio or format works — swap the file and nothing else changes.
 */

/**
 * The virtual payment address, shown as copyable text beneath the QR.
 *
 * `null` until it is filled in. The QR on its own is enough to receive money,
 * so the page omits the text ID and the deep-link button entirely rather than
 * printing a placeholder address next to a working code. Set it to the VPA the
 * payment app shows (something like `name@ybl`) and both appear.
 */
export const UPI_ID: string | null = "dmattrainer@axl";

/** Shown by the payment app as the payee, so the transfer looks deliberate. */
export const UPI_PAYEE_NAME = "dMAT Trainer";

/** For "something is wrong / thank you / this rule looks off" mail. */
export const CONTACT_EMAIL = "jeevesh2107@gmail.com";

/** The QR image on the support page. */
export const UPI_QR_SRC = "/upi-qr.jpeg";

/**
 * `upi://` intent link. On a phone this opens the installed payment app with
 * the payee pre-filled; on a desktop browser nothing handles the scheme, which
 * is why the page shows the ID as copyable text as well. `null` while
 * `UPI_ID` is unset, since the scheme needs an address.
 */
export const UPI_DEEP_LINK = UPI_ID === null ? null : `upi://pay?pa=${encodeURIComponent(UPI_ID)}&pn=${encodeURIComponent(UPI_PAYEE_NAME)}&cu=INR`;

/** The support page's own route, so the callouts cannot drift from it. */
export const SUPPORT_HREF = "/support";
