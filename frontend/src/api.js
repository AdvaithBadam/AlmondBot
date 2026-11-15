// Set VITE_API_URL only when the backend lives on another origin; otherwise paths are relative.
const BASE = import.meta.env.VITE_API_URL || "";

export async function getHealth() {
    const res = await fetch(`${BASE}/api/health`);
    if (!res.ok) throw new Error(`Health check failed (${res.status})`);
    return res.json();
}

// Async generator: yields each server-sent event ({type: "sources" | "token" | "done" | "error", ...}).
export async function* streamChat(question, history, signal) {
    const res = await fetch(`${BASE}/api/chat/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, history }),
        signal,
    });
    if (!res.ok || !res.body) throw new Error(`Request failed (${res.status})`);

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // Events end with a blank line; keep any incomplete trailing event in the buffer
        const frames = buffer.split("\n\n");
        buffer = frames.pop();
        for (const frame of frames) {
            const line = frame.split("\n").find((l) => l.startsWith("data: "));
            if (line) yield JSON.parse(line.slice(6));
        }
    }
}
