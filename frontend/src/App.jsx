import { useEffect, useState } from "react";
import { getHealth } from "./api";
import Chat from "./components/Chat";

export default function App() {
    const [chunks, setChunks] = useState(null);
    const [offline, setOffline] = useState(false);

    useEffect(() => {
        getHealth()
            .then((h) => setChunks(h.chunks))
            .catch(() => setOffline(true));
    }, []);

    return (
        <div className="app">
            <header>
                <h1>Ragbot</h1>
                {chunks !== null && <span>{chunks} chunks indexed</span>}
            </header>

            {offline && (
                <p className="banner bad">
                    Can't reach the backend. Start it with <code>uvicorn backend.app.main:app --port 8000</code>.
                </p>
            )}
            {chunks === 0 && (
                <p className="banner">
                    No documents indexed yet. Put PDFs in <code>data/pdf/</code>, run{" "}
                    <code>python rag/scripts/ingest.py</code>, then reload this page.
                </p>
            )}

            <Chat />
        </div>
    );
}
