# New York Burger

A shared group site for movies, games, and funny video links.

## Sharing video links

The Videos page lets users paste YouTube, TikTok, Instagram, or normal links. YouTube titles are fetched automatically when possible, then saved to the shared Supabase `video_links` table.

## Android PWA sharing

After installing the site as a PWA on Android/Chrome, the manifest share target can receive links from apps such as YouTube:

```text
YouTube → Share → New York Burger → Save to videos
```

The share target opens:

```text
/NewYorkBurger/?share-target=videos&title=...&text=...&url=...
```

## iPhone sharing with Shortcuts

The YouTube iPhone app does not reliably show installed PWAs as share destinations, so use an iOS Shortcut instead.

Create a Shortcut named **Save to NY Burger**:

1. Open the Shortcuts app.
2. Create a new shortcut.
3. Open the shortcut details and enable **Show in Share Sheet**.
4. Set accepted input to **URLs** and/or **Text**.
5. Add a **URL Encode** action for the Shortcut Input.
6. Add a **URL** action with this value:

```text
https://sippos.github.io/NewYorkBurger/?share-target=videos&url=ENCODED_SHORTCUT_INPUT
```

7. Add **Open URLs**.

After that, the intended iPhone flow is:

```text
YouTube → Share → Save to NY Burger → site opens with the link prefilled → Save to videos
```

The website still fetches the YouTube title and saves through the same video upload code path as the Videos page.
