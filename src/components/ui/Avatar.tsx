import { cn, initials } from "@/lib/utils";

export function Avatar({
  name,
  image,
  size = 32,
  className,
}: {
  name?: string | null;
  image?: string | null;
  size?: number;
  className?: string;
}) {
  if (image) {
    return (
      <img
        src={image}
        alt={name ?? "avatar"}
        width={size}
        height={size}
        className={cn("rounded-full object-cover", className)}
      />
    );
  }
  return (
    <div
      className={cn(
        "rounded-full bg-brand-100 text-brand-700 font-semibold flex items-center justify-center",
        className,
      )}
      style={{ width: size, height: size, fontSize: size * 0.42 }}
    >
      {initials(name)}
    </div>
  );
}
