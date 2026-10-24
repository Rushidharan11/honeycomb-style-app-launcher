<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep the launcher's two-axis translation and periodic wrapping in a browser-safe motion module, so thumb-following movement can be tested independently of rendering.
- The launcher is mobile-only responsive: full-bleed below 768px, a centered 390x844 phone frame above; honeycomb metrics (BASE/GAP_X/GAP_Y/TOP) derive from viewport width clamped to 0.78–1.15 so density adapts to phone sizes, and the surface measures itself with a ResizeObserver rather than window size.
