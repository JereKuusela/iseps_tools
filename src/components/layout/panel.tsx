import type { ParentProps } from "solid-js";

export function Panel(props: ParentProps<{ title: string; subtitle: string }>) {
  return (
    <section class="rounded-3xl border border-white/70 bg-white/85 p-5 shadow-glow backdrop-blur sm:p-8 lg:p-9">
      <h2 class="text-2xl font-bold text-ink">{props.title}</h2>
      <p class="mt-2 text-sm text-ink/70">{props.subtitle}</p>
      <div class="mt-5 sm:mt-6">{props.children}</div>
    </section>
  );
}
