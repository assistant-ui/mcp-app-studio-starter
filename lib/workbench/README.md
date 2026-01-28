# Workbench SDK

React hooks for building widgets that run on ChatGPT and MCP hosts (Claude Desktop, etc.). These hooks provide access to platform APIs, which are simulated locally in the workbench and work in production when deployed.

## Universal Mode

The workbench operates in **universal mode** — all platform features are available for testing. When your widget is deployed, it will automatically adapt to the actual platform (ChatGPT or MCP) using feature detection.

The export dialog shows platform compatibility information to help you understand which features work where.

## Supported Platforms

Build once, deploy anywhere:

- **ChatGPT** — via the ChatGPT Apps SDK
- **MCP Hosts** — via the Model Context Protocol (Claude Desktop, etc.)

## Quick Start

```tsx
import {
  useToolInput,
  useTheme,
  useCallTool,
  usePlatform,
  useCapabilities,
} from "@/lib/workbench";

function MyWidget() {
  const input = useToolInput<{ query: string }>();
  const theme = useTheme();
  const callTool = useCallTool();
  const platform = usePlatform();
  const capabilities = useCapabilities();

  const handleSearch = async () => {
    const result = await callTool("search", { query: input.query });
    console.log(result.structuredContent);
  };

  return (
    <div className={theme === "dark" ? "dark" : ""}>
      <p>Query: {input.query}</p>
      <p>Platform: {platform}</p>
      <button onClick={handleSearch}>Search</button>

      {capabilities.widgetState && (
        <p>Widget state available (ChatGPT only)</p>
      )}
    </div>
  );
}
```

---

## Hooks Reference

### Platform Detection

#### `usePlatform()`

Returns the current platform: `"chatgpt"` or `"mcp"`.

```tsx
const platform = usePlatform();
if (platform === "mcp") {
  // Use MCP-specific features
}
```

#### `useCapabilities()`

Returns an object describing platform-specific capabilities.

```tsx
const capabilities = useCapabilities();
// capabilities.widgetState - ChatGPT only
// capabilities.toolInputPartial - MCP only
// capabilities.modelContext - MCP only
// capabilities.fileUpload - ChatGPT only
// capabilities.sendMessage - Both
// capabilities.displayModes - Both
// capabilities.log - MCP only
```

#### `useFeature(name)`

Check if a specific feature is available.

```tsx
const hasWidgetState = useFeature("widgetState");
if (hasWidgetState) {
  // Use widget state
}
```

---

### Reading State

#### `useToolInput<T>()`

Returns the input passed to your widget from the MCP tool call.

```tsx
const input = useToolInput<{ city: string; units?: "metric" | "imperial" }>();
// input.city, input.units
```

#### `useToolInputPartial<T>()` (MCP only)

Returns partial input as it streams in. Useful for real-time updates.

```tsx
const partial = useToolInputPartial<{ query: string }>();
const final = useToolInput<{ query: string }>();

if (partial && !final) {
  return <div className="opacity-50">{partial.query}...</div>;
}
```

#### `useToolOutput<T>()`

Returns the most recent tool call response, or `null` if no tool has been called.

```tsx
const output = useToolOutput<{ temperature: number; conditions: string }>();
// output?.temperature, output?.conditions
```

#### `useTheme()`

Returns the current theme: `"light"` or `"dark"`.

```tsx
const theme = useTheme();
// Apply conditional styling based on theme
```

#### `useDisplayMode()`

Returns the current display mode: `"inline"`, `"pip"`, or `"fullscreen"`.

```tsx
const displayMode = useDisplayMode();
const isFullscreen = displayMode === "fullscreen";
```

#### `usePreviousDisplayMode()`

Returns the previous display mode (useful for transition animations), or `null`.

```tsx
const previousMode = usePreviousDisplayMode();
const expandedFromInline = previousMode === "inline";
```

#### `useLocale()`

Returns the user's locale string (e.g., `"en-US"`).

```tsx
const locale = useLocale();
const formatted = new Intl.NumberFormat(locale).format(1234.56);
```

#### `useWidgetState<T>(defaultState?)` (ChatGPT only)

Returns a tuple `[state, setState]` for persistent widget state that survives across tool calls.

```tsx
const [state, setState] = useWidgetState({ selectedId: null, favorites: [] });

// Update state
setState({ ...state, selectedId: "abc" });

// Or use updater function
setState((prev) => ({ ...prev, selectedId: "abc" }));
```

> **Note:** On MCP, this hook logs a warning and returns `[null, no-op]`. Use `useUpdateModelContext()` instead for MCP-specific context sharing.

#### `useView()`

Returns the current view configuration, or `null`. Used for modal overlays.

```tsx
const view = useView();
if (view?.mode === "modal") {
  return <ModalContent params={view.params} />;
}
```

---

### Calling Methods

#### `useCallTool()`

Returns a function to call MCP tools. Returns a `Promise<CallToolResponse>`.

```tsx
const callTool = useCallTool();

const handleRefresh = async () => {
  const result = await callTool("refresh_data", { id: "123" });

  if (result.isError) {
    console.error(result.content);
    return;
  }

  console.log(result.structuredContent);
};
```

**CallToolResponse shape:**

```ts
interface CallToolResponse {
  structuredContent?: Record<string, unknown>; // Success data
  content?: string; // Error message
  isError?: boolean; // True if error
  _meta?: Record<string, unknown>; // Metadata
}
```

#### `useRequestDisplayMode()`

Returns a function to request a display mode change.

```tsx
const requestDisplayMode = useRequestDisplayMode();

const handleExpand = () => requestDisplayMode({ mode: "fullscreen" });
const handleCollapse = () => requestDisplayMode({ mode: "inline" });
```

#### `useSendFollowUpMessage()`

Returns a function to send a message to the assistant on behalf of the user.

```tsx
const sendFollowUpMessage = useSendFollowUpMessage();

const handleAskMore = () => {
  sendFollowUpMessage({ prompt: "Tell me more about this location" });
};
```

#### `useOpenExternal()`

Returns a function to open a URL in a new browser tab.

```tsx
const openExternal = useOpenExternal();

const handleOpenWebsite = (url: string) => {
  openExternal({ href: url });
};
```

#### `useUploadFile()` (ChatGPT only)

Returns a function to upload a file. Returns `{ fileId: string }`.

```tsx
const uploadFile = useUploadFile();

const handleUpload = async (file: File) => {
  const { fileId } = await uploadFile(file);
  console.log("Uploaded:", fileId);
};
```

#### `useGetFileDownloadUrl()` (ChatGPT only)

Returns a function to get a download URL for an uploaded file.

```tsx
const getFileDownloadUrl = useGetFileDownloadUrl();

const handleDownload = async (fileId: string) => {
  const { downloadUrl } = await getFileDownloadUrl({ fileId });
  window.open(downloadUrl);
};
```

#### `useUpdateModelContext()` (MCP only)

Returns a function to update the model's context with structured data.

```tsx
const updateContext = useUpdateModelContext();

const handleDataChange = async (data: object) => {
  await updateContext({
    structuredContent: { currentData: data },
  });
};
```

> **Note:** On ChatGPT, this hook logs a warning and returns a no-op. Use `useWidgetState()` instead for ChatGPT-specific state persistence.

#### `useLog()` (MCP only)

Returns a function for structured logging to the MCP host.

```tsx
const log = useLog();

const handleAction = () => {
  log("info", "User clicked button");
  log("debug", `Processing data: ${JSON.stringify(data)}`);
};
```

---

## Common Patterns

### Platform-Specific Features

```tsx
function CrossPlatformWidget() {
  const platform = usePlatform();
  const capabilities = useCapabilities();
  const [state, setState] = useWidgetState({ count: 0 });
  const updateContext = useUpdateModelContext();

  const handleChange = async (data: object) => {
    if (capabilities.widgetState) {
      // ChatGPT: persist in widget state
      setState(data);
    }
    if (capabilities.modelContext) {
      // MCP: update model context
      await updateContext({ structuredContent: data });
    }
  };

  return (
    <div>
      <p>Running on: {platform}</p>
      <button onClick={() => handleChange({ count: 1 })}>Update</button>
    </div>
  );
}
```

### Loading State When Calling Tools

```tsx
function SearchWidget() {
  const callTool = useCallTool();
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState(null);

  const handleSearch = async (query: string) => {
    setIsLoading(true);
    try {
      const response = await callTool("search", { query });
      setResults(response.structuredContent);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) return <Spinner />;
  return <ResultsList results={results} />;
}
```

### Handling Tool Errors

```tsx
const handleAction = async () => {
  const result = await callTool("risky_action", { id });

  if (result.isError) {
    // result.content contains the error message
    showError(result.content);
    return;
  }

  // Success - use result.structuredContent
  processData(result.structuredContent);
};
```

### Display Mode Transitions

```tsx
function ExpandableWidget() {
  const displayMode = useDisplayMode();
  const requestDisplayMode = useRequestDisplayMode();

  return (
    <div className={displayMode === "fullscreen" ? "h-screen" : "h-64"}>
      <button
        onClick={() =>
          requestDisplayMode({
            mode: displayMode === "fullscreen" ? "inline" : "fullscreen",
          })
        }
      >
        {displayMode === "fullscreen" ? "Collapse" : "Expand"}
      </button>
    </div>
  );
}
```

### Persisting User Preferences (ChatGPT)

```tsx
interface WidgetPrefs {
  sortOrder: "asc" | "desc";
  showDetails: boolean;
}

function PreferencesWidget() {
  const [prefs, setPrefs] = useWidgetState<WidgetPrefs>({
    sortOrder: "asc",
    showDetails: false,
  });

  const toggleDetails = () => {
    setPrefs((prev) => ({ ...prev, showDetails: !prev?.showDetails }));
  };

  return (
    <button onClick={toggleDetails}>
      {prefs?.showDetails ? "Hide" : "Show"} Details
    </button>
  );
}
```

### Responding to Theme Changes

```tsx
function ThemedWidget() {
  const theme = useTheme();

  return (
    <div
      className={cn(
        "p-4 rounded-lg",
        theme === "dark" ? "bg-gray-800 text-white" : "bg-white text-gray-900"
      )}
    >
      Content adapts to theme
    </div>
  );
}
```

---

## Full Examples

See complete widget implementations:

- **POI Map** - `components/examples/poi-map/` + `lib/workbench/wrappers/poi-map-sdk.tsx`
- **Welcome Card** - `components/examples/welcome-card/` + `lib/workbench/wrappers/welcome-card-sdk.tsx`

---

## Workbench Features

### Display Modes

The workbench toolbar lets you preview your widget in different display modes:

| Mode | Description |
| --- | --- |
| **Inline** | Widget appears embedded in the conversation flow (default) |
| **PiP** | Widget floats above the conversation as a picture-in-picture overlay |
| **Fullscreen** | Widget takes over the entire viewport |

Use these modes to test how your widget adapts to different contexts. Your widget can read the current mode via `useDisplayMode()` and request changes via `useRequestDisplayMode()`.

### Device Types

Test responsive layouts by switching between device presets:

- **Desktop** — Full width (770px max)
- **Tablet** — Tablet viewport
- **Mobile** — Mobile viewport
- **Resizable** — Drag to resize freely

### Conversation Mode

Conversation Mode (chat bubble icon, inline mode only) shows your widget in a simulated conversation context:

```
┌─────────────────────────────────────┐
│  User: "Show me coffee shops nearby" │  ← User message
├─────────────────────────────────────┤
│  🔄 Using poi_search...              │  ← Tool indicator
├─────────────────────────────────────┤
│  ┌─────────────────────────────────┐│
│  │     [Your Widget]               ││  ← Widget preview
│  └─────────────────────────────────┘│
├─────────────────────────────────────┤
│  Assistant: "Here are some nearby..."│  ← Response
└─────────────────────────────────────┘
```

This helps visualize the full flow: user prompt → tool call → widget render → assistant response.

**Customizing conversation messages:**

Add a `conversation` field to your mock variant in `lib/workbench/mock-config/`:

```ts
{
  id: "coffee-search",
  name: "Coffee Search",
  toolInput: { query: "coffee shops", location: "San Francisco" },
  conversation: {
    userMessage: "Find coffee shops near me",
    assistantResponse: "I found several great coffee shops nearby. Tap any location for details!"
  }
}
```

---

## Keyboard Shortcuts (Workbench Only)

| Shortcut               | Action            |
| ---------------------- | ----------------- |
| `Cmd/Ctrl + Shift + D` | Toggle theme      |
| `Cmd/Ctrl + Shift + F` | Toggle fullscreen |
| `Cmd/Ctrl + K`         | Clear console     |
