/** Class joiner for copied purrfect ui components. ponytail: no tailwind-merge, so a later class does not override an earlier clashing one. */
export const cn = (...inputs: (string | false | null | undefined)[]) => inputs.filter(Boolean).join(" ");
