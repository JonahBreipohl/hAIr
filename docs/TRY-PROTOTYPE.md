# Try the hAIr prototype

The current app is a local browser prototype. It demonstrates the consultation
workflow, but its preview cards are simulations, not AI hairstyle edits.

## Open it

When the local server is running, open <http://127.0.0.1:3000> in a browser on
this computer. This address is not a public website and will not reach the
computer from a phone. The server must keep running while you use the app.

The server started for the 2026-10-04 walkthrough uses the existing production
build. To restart that build with the dependencies already installed on this
computer, open PowerShell and run:

```powershell
Set-Location -LiteralPath 'C:\Users\jljro\Code Projects\hAIr\apps\web'
node node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 3000
```

Leave that terminal running. Ctrl+C stops the server. If port 3000 is occupied,
check whether hAIr is already running before starting another copy. This command
serves the saved build; subsequent source changes require a new build.

The normal development command is `pnpm dev` from the repository root, but the
current pnpm launcher cannot resolve its pinned version from the offline mirror.
The direct Node command above uses the installed dependencies and existing build;
it does not establish that a clean installation on another computer works.

## Explore the flow

For the consent screen, use your own adult consultation or the synthetic demo.
Read the acknowledgements before continuing. On the photo screen, select
**Use synthetic demo portrait** to explore without supplying a real photo.
Then describe a look, generate simulated previews, compare them, record stylist
feasibility, and review the agreed plan. Deletion and sharing demonstrate local
prototype behavior; sharing does not create a working public cloud link.

To try the local photo picker, select **Take or choose photo** and choose a JPEG,
PNG, or WebP no larger than 10 MB. The current prototype holds the image in this
browser and does not upload it to an AI provider or save it in the repository.
It does not actually transform the hair. Refreshing ends the in-memory photo
session; the Delete action also releases the local image references.

## Supply photos for a future AI benchmark

Selecting a photo in this prototype does not submit it to the benchmark or give
the project access to it. Keep proposed benchmark images in a separate private
folder outside this repository. Provide the folder location and the basis for
permission before processing: who granted it, adult status, whether AI-provider
transfer is permitted, and any retention or use restrictions. Do not put names
or private permission documents in source control.

An initial photo of yourself can support an exploratory smoke test after explicit
permission and provider setup. It cannot establish quality across different hair
textures and client situations. The representative benchmark remains a separate
gate, with restricted media handling and a spending cap before live calls.

No API account, benchmark photos, or spending authorization is needed to inspect
the current simulated interface.
