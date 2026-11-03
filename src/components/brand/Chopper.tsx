/**
 * Chopper in his Wano look. The picture is public/chopper.png, cut out of artwork the project owner supplied (it carries
 * a One Piece copyright mark), so check the licence before deploying publicly. Replace that one file to change how he
 * looks everywhere; the bottom of the image is where his foot should rest.
 */
export function Chopper({ className }: { className?: string }) {
  return (
    // A plain <img>: it is a small static picture, so next/image's optimisation would add nothing.
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/chopper.png" alt="" aria-hidden draggable={false} className={`object-contain ${className ?? ""}`} />
  );
}
