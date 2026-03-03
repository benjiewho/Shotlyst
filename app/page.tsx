import Link from "next/link";
import {
  ClipboardList,
  Video,
  CheckCircle,
  ListTodo,
  Film,
  CircleX,
} from "lucide-react";
import { LandingNav } from "@/components/landing-nav";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const PROBLEM_BULLETS = [
  {
    text: "Too many ideas, no structure.",
    icon: ListTodo,
  },
  {
    text: "You film everything and fix it in the edit.",
    icon: Film,
  },
  {
    text: "Or you forget the shots that would have made the cut.",
    icon: CircleX,
  },
] as const;

const HOW_IT_WORKS_STEPS = [
  {
    step: "Plan",
    title: "Plan",
    description:
      "Define your goal and audience. Get a shot list so you know what to film.",
    icon: ClipboardList,
  },
  {
    step: "Capture",
    title: "Capture",
    description:
      "Film with the checklist on your phone. Mark shots as you go.",
    icon: Video,
  },
  {
    step: "Review",
    title: "Review",
    description:
      "See what you got, what's missing, and how it performed.",
    icon: CheckCircle,
  },
] as const;

function PhoneMock({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={
        "mx-auto w-[280px] rounded-[2rem] border-[10px] border-border bg-card shadow-xl " +
        className
      }
    >
      <div className="h-[480px] overflow-hidden rounded-[1.25rem] bg-muted/30">
        {children}
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <LandingNav />

      <main className="flex-1">
        {/* Section 1 — Hero */}
        <section className="mx-auto max-w-6xl px-4 py-10 sm:py-16">
          <div className="flex flex-col items-center gap-6 text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground text-2xl font-bold shadow-md">
                S
              </div>
              <h1 className="max-w-xl text-2xl font-bold tracking-tight text-foreground sm:text-3xl md:text-4xl">
                Plan your shots. Film with a checklist. Post without the
                guesswork.
              </h1>
              <p className="max-w-lg text-base text-muted-foreground sm:text-lg">
                Define your goal, get a shot plan, and film with the list on
                your phone. No more filming aimlessly or fixing it in the edit.
              </p>
            </div>
            <div className="flex w-full max-w-sm flex-col gap-3">
              <Button className="min-h-12 w-full" size="lg" asChild>
                <Link href="/login">Continue with Google</Link>
              </Button>
              <p className="text-center text-sm text-muted-foreground">Or</p>
              <Button variant="ghost" className="min-h-12 w-full" asChild>
                <Link href="/signup" className="text-primary font-medium">
                  Sign up with Email
                </Link>
              </Button>
            </div>
            {/* Product preview — phone mock (below on mobile) */}
            <div className="mt-8 w-full max-w-[280px] sm:mt-12">
              <PhoneMock>
                <div className="flex h-full flex-col p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Project
                  </p>
                  <p className="mb-4 font-semibold text-foreground">
                    Cafe Onion — Seongsu
                  </p>
                  <p className="mb-2 text-xs font-medium text-muted-foreground">
                    Shot list
                  </p>
                  <ul className="space-y-2 text-sm text-foreground">
                    <li className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-primary" />
                      Exterior establishing
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-primary" />
                      Pastry close-up
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-muted-foreground" />
                      First bite reaction
                    </li>
                  </ul>
                  <div className="mt-auto pt-4">
                    <div className="rounded-xl border border-border bg-background py-2 text-center text-sm font-medium text-primary">
                      Open camera
                    </div>
                  </div>
                </div>
              </PhoneMock>
            </div>
          </div>
        </section>

        {/* Section 2 — The real problem */}
        <section
          id="problem"
          className="border-t border-border bg-muted/20 py-12 sm:py-16"
        >
          <div className="mx-auto max-w-6xl px-4">
            <h2 className="mb-8 text-center text-xl font-semibold text-foreground sm:text-2xl">
              Filming without a plan doesn&apos;t scale.
            </h2>
            <ul className="mx-auto flex max-w-2xl flex-col gap-6 sm:grid sm:grid-cols-3">
              {PROBLEM_BULLETS.map(({ text, icon: Icon }) => (
                <li
                  key={text}
                  className="flex items-start gap-3 rounded-xl border border-border bg-card p-4"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <Icon className="h-5 w-5" />
                  </span>
                  <p className="text-sm font-medium text-foreground sm:text-base">
                    {text}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Section 3 — How Shotlyst helps */}
        <section
          id="how-it-works"
          className="border-t border-border py-12 sm:py-16"
        >
          <div className="mx-auto max-w-6xl px-4">
            <h2 className="mb-8 text-center text-xl font-semibold text-foreground sm:text-2xl">
              How Shotlyst helps
            </h2>
            <div className="grid gap-6 sm:grid-cols-3">
              {HOW_IT_WORKS_STEPS.map(({ step, title, description, icon: Icon }) => (
                <Card
                  key={step}
                  className="flex flex-col border-border bg-card"
                >
                  <CardHeader className="pb-2">
                    <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <CardTitle className="text-left text-lg">{title}</CardTitle>
                  </CardHeader>
                  <CardContent className="flex-1 pt-0">
                    <p className="text-sm text-muted-foreground">{description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Section 4 — Product proof */}
        <section
          id="see-it"
          className="border-t border-border bg-muted/20 py-12 sm:py-16"
        >
          <div className="mx-auto max-w-6xl px-4">
            <h2 className="mb-8 text-center text-xl font-semibold text-foreground sm:text-2xl">
              See the product
            </h2>
            <div className="flex flex-col items-center gap-8 lg:flex-row lg:justify-center lg:gap-12">
              <div className="w-full max-w-[280px]">
                <p className="mb-2 text-center text-sm font-medium text-muted-foreground">
                  Shot list
                </p>
                <PhoneMock>
                  <div className="flex h-full flex-col p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Your plan
                    </p>
                    <p className="mb-3 font-semibold text-foreground">
                      Cafe Onion — Seongsu
                    </p>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-center gap-2 text-foreground">
                        <span className="rounded bg-primary/20 px-1.5 py-0.5 text-xs font-medium text-primary">
                          Must
                        </span>
                        Exterior establishing
                      </li>
                      <li className="flex items-center gap-2 text-foreground">
                        <span className="rounded bg-primary/20 px-1.5 py-0.5 text-xs font-medium text-primary">
                          Must
                        </span>
                        Pastry close-up
                      </li>
                      <li className="flex items-center gap-2 text-muted-foreground">
                        <span className="rounded bg-muted px-1.5 py-0.5 text-xs">
                          Nice
                        </span>
                        First bite reaction
                      </li>
                    </ul>
                  </div>
                </PhoneMock>
              </div>
              <div className="w-full max-w-[280px]">
                <p className="mb-2 text-center text-sm font-medium text-muted-foreground">
                  Capture mode
                </p>
                <PhoneMock>
                  <div className="flex h-full flex-col p-4">
                    <p className="mb-1 text-xs text-muted-foreground">
                      Scene 1
                    </p>
                    <p className="mb-4 font-semibold text-foreground">
                      Exterior establishing
                    </p>
                    <div className="mb-4 flex-1 rounded-lg border border-dashed border-border bg-muted/30 flex items-center justify-center text-xs text-muted-foreground">
                      Open camera
                    </div>
                    <div className="flex gap-2">
                      <div className="flex-1 rounded-lg border border-border py-2 text-center text-xs font-medium">
                        Skip
                      </div>
                      <div className="flex-1 rounded-xl bg-primary py-2 text-center text-xs font-medium text-primary-foreground">
                        Captured
                      </div>
                    </div>
                  </div>
                </PhoneMock>
              </div>
              <div className="w-full max-w-[280px]">
                <p className="mb-2 text-center text-sm font-medium text-muted-foreground">
                  Report
                </p>
                <PhoneMock>
                  <div className="flex h-full flex-col p-4">
                    <p className="mb-3 text-xs font-medium text-muted-foreground">
                      Project report
                    </p>
                    <p className="mb-4 text-lg font-semibold text-foreground">
                      7 of 9 key shots captured
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Strong: pastry close-up, first bite. Missing: menu board.
                    </p>
                  </div>
                </PhoneMock>
              </div>
            </div>
          </div>
        </section>

        {/* Section 5 — CTA block */}
        <section className="border-t border-border py-12 sm:py-16">
          <div className="mx-auto max-w-6xl px-4">
            <div className="flex flex-col items-center gap-6 text-center">
              <h2 className="text-xl font-semibold text-foreground sm:text-2xl">
                Ready to plan your next shoot?
              </h2>
              <div className="flex w-full max-w-sm flex-col gap-3">
                <Button className="min-h-12 w-full" size="lg" asChild>
                  <Link href="/login">Continue with Google</Link>
                </Button>
                <p className="text-center text-sm text-muted-foreground">
                  Free to start
                </p>
                <Button variant="ghost" className="min-h-12 w-full" asChild>
                  <Link href="/signup" className="text-primary font-medium">
                    Sign up with Email
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
