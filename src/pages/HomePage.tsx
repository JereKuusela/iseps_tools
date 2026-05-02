import { A } from "@solidjs/router"
import { For } from "solid-js"
import { toolCards } from "../lib/routes"

export const HomePage = () => {
  return (
    <section class="mx-auto w-full max-w-6xl">
      <div class="rounded-3xl border border-white/60 bg-white/75 p-6 shadow-glow backdrop-blur dark:border-white/10 dark:bg-[#101a2a]/75 sm:p-8 lg:p-10">
        <div class="max-w-3xl">
          <p class="text-xs font-semibold uppercase tracking-[0.22em] text-teal-700 dark:text-teal-300">ISEPS Tools</p>
          <h1 class="mt-2 text-3xl font-black tracking-tight text-ink dark:text-white sm:text-4xl">
            Pick a tool to get started
          </h1>
          <p class="mt-3 text-sm leading-relaxed text-ink/80 dark:text-[#d6e5ff]/85 sm:text-base">
            This entry page gives a quick overview of each calculator and guide so you can jump to the right workflow.
          </p>
        </div>

        <div class="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <For each={toolCards}>
            {(tool, index) => (
              <A
                href={tool.href}
                class="group relative overflow-hidden rounded-2xl border border-ink/15 bg-gradient-to-br from-white to-[#f8fffc] p-4 transition duration-200 hover:-translate-y-1 hover:border-teal-500/50 hover:shadow-xl dark:border-white/15 dark:from-[#132236] dark:to-[#0a121f]"
                style={{ "animation-delay": `${index() * 55}ms` }}
              >
                <div class="pointer-events-none absolute -right-12 -top-14 h-32 w-32 rounded-full bg-[#12a89d]/10 blur-xl transition group-hover:bg-[#12a89d]/20" />
                <p class="relative text-base font-bold text-ink dark:text-white">{tool.label}</p>
                <p class="relative mt-2 text-sm leading-relaxed text-ink/75 dark:text-[#d6e5ff]/80">
                  {tool.description}
                </p>
                <p class="relative mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-teal-700 dark:text-teal-300">
                  Open Tool
                </p>
              </A>
            )}
          </For>
        </div>
      </div>
    </section>
  )
}
