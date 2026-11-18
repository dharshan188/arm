# Sorti — a small sort, a better tomorrow

## Art direction

A friendly public instrument, borrowing the clarity of civic wayfinding and the care of a physical audio device. A warm paper shell holds an ink camera aperture. Large typography does the work; a restrained arrow, numbered steps and four familiar waste colours make the destination immediately clear. The lime microphone key is the main action. The welcome screen pairs a dark editorial poster with a multilingual dialogue. No external assets, emoji icons, ambient video, canvas or backdrop blur.

This is designed for people walking up to the kiosk in India, not for someone operating a model dashboard. Public copy uses the chosen language. All three language choices retain their own scripts. Model status, latency and memory remain available in a quieter footer.

## Tokens

| Role | Value | Usage |
| --- | --- | --- |
| Paper | `#f3f1e8` | Shell and reading surfaces |
| Ink | `#20251f` | Primary text, camera chrome, welcome poster |
| Muted ink | `#586052` | Secondary text on paper |
| Rule | `#c9cdbf` | Dividers; never used for text |
| Lime | `#d6f269` | Ask key, camera frame, welcome emphasis; ink text |
| Recording | `#f3a18c` | Recording surface with ink text |
| Green | `#176b3b` | Wet waste |
| Blue | `#245dc1` | Dry recyclable waste |
| Red | `#b72f35` | Hazardous waste |
| Grey | `#576168` | E-waste collector |

Result surfaces use light flat tints of their bin category. Active bins use white text on their semantic colour. Inactive labels remain ink on paper, never dimmed with opacity. Colour is paired with labels, a checkmark and a destination arrow. Text-pair contrast is verified by the static audit; dynamic camera labels and subtitles have solid dark backplates.

## Typography and distance

Local WOFF2 assets: Lato regular, bold and heavy for Latin; Lohit Tamil and Lohit Devanagari for script coverage. The Google Fonts download was attempted and failed because shell DNS is unavailable. System Noto font names remain as fallbacks, but no system font installation is required. Source licences are under `fonts/`. These open-source families are not renamed internally; the CSS family aliases isolate application styling.

| Element | 1280px | 1920px |
| --- | --- | --- |
| Main imperative | 52px | 73px |
| Item name, Latin | 52px | 77px |
| Destination | 34px | 46px |
| Ask action | 27px | 36px |
| Body / transcript | 21px | 26px |
| Secondary / diagnostic | 16px | 16–20px |

Tamil and Hindi primary text uses 1.45–1.55 line height, no tracking and a smaller size to accommodate script width. Their font metrics must be checked on rendered screenshots. Main instructions and destination are intended to be read from two metres; secondary operator details are for nearer viewing. Actual readability at that distance requires the target monitor and its physical size, not merely a screenshot.

## Layout and states

The desktop shell has a header, a fluid two-column main grid and a diagnostic footer. At 1920×1080 the camera gets around 56% of main content width; at 1280×800 it remains the wider column. Camera media is always 16:9 and contained, preserving the classifier square. The result rail is separated by a single vertical rule. Under 900px the layout becomes a scrollable column.

- **Welcome:** full-screen overlay with poster left, three questions and equal language alternatives right. Asking, listening, detecting and waiting have explicit status copy. The mic colour/level reflect the server phase. The underlying application is inert while welcome is open.
- **Loading:** visible loading text; microphone and typed input unavailable. No unexplained spinner taking over the screen.
- **Watching:** camera square and instruction. Result area explains the next action; all four bin destinations are visible.
- **Seeing:** classifier confidence becomes readable near the lower camera edge; framing remains stable. Prediction is not presented as an announced item.
- **Detected / speaking:** category tint, oversized item and bin, outlined physical bin glyph, active stream check. Speaking is also shown in the header, transcript and small voice bars.
- **Video:** full camera stage becomes muted educational media. Item and bin selection remain on the right. Caption, credit, skip and progress stay inside the stage. Mock poster is clearly labelled as a placeholder.
- **Listening:** salmon ask key, mic level and recorded seconds; label explains release or second-tap submission. A real server level drives the meter.
- **Thinking:** plain-language state and quieter key, with subtle opacity motion. Transcript remains available; duplicate typed requests are disabled while busy.
- **Answer:** answer in the conversation, speaking indication, translation if provided, and truthful English-reply metadata when the model cannot answer in Tamil. Ask interrupts as before.

Chat history scrolls within its own region. Long facts can scroll on large screens; on compact screens the duplicate fact is omitted from the result card, while explanations/transcripts stay in chat. The current result and primary controls always take priority.

## Motion, interaction and accessibility

Use cubic-bezier(.22,.8,.25,1) for 180–280ms control/entry transitions. New messages enter by 8px with opacity. Voice bars use scaleY. Progress and confidence use scaleX. No animated shadows or large filters. Reduced-motion disables CSS animation/transitions and smooth chat scrolling.

Keep pointer hold/release, short tap toggle, Enter activation and Space toggle. Inputs keep normal Space entry. Welcome also supports hold Space. Camera/audio stay owned by the server; the UI never calls getUserMedia or browser speech APIs. The existing 250ms poll and message patch refresh remain unchanged.

Controls have focus-visible outlines; text input keeps a real label and gains a visible submit button. Language touch targets are at least 44px high; the main microphone key is 90–100px minimum. Live camera telemetry is not an aria-live region. Status, announced result and conversation retain their accessibility semantics.

## Reviewable demo URLs

Use `?mock=1` for the cycling demo. Use `?mock=1&scene=watching&lang=ta` for a fixed scene. Supported scenes: `welcome-asking`, `welcome-listening`, `welcome-detecting`, `welcome-waiting`, `loading`, `watching`, `seeing`, `detected`, `speaking`, `video`, `listening`, `thinking`, `answer`. Add `item=0|1|2|3` for blue/red/green/grey fixtures. A visitor action resumes the normal mock cycle. See REVIEW.md for commands, checks, blockers and outstanding visual inspection.
