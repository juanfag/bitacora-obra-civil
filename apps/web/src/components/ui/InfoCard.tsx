import { ReactNode } from "react";

type InfoCardProps = {
  children: ReactNode;
  className?: string;
  title?: string;
};

export function InfoCard({ children, className, title }: InfoCardProps) {
  const classes = ["panel", className].filter(Boolean).join(" ");

  return (
    <article className={classes}>
      {title ? <h2>{title}</h2> : null}
      {children}
    </article>
  );
}
