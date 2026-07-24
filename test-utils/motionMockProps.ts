/**
 * Prop type for framer-motion `motion.*` component test mocks.
 * Framer's real props (drag, initial, animate, ...) don't matter to the mocks —
 * they're destructured off and discarded before spreading the rest onto a DOM node.
 * `children` is left as `unknown` (like every other prop) — cast it to `ReactNode`
 * at the JSX usage site, since mixing an index signature with a named optional
 * property here makes TS widen the named property to `unknown` anyway.
 */
export type MotionMockProps = {
  [key: string]: unknown;
};
