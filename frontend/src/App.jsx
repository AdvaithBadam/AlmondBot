import { useEffect, useState } from "react";
import { getInfo } from "./api";
import About from "./components/About";
import Chat from "./components/Chat";
import Sidebar from "./components/Sidebar";

export default function App() {
    const [view, setView] = useState("chat");
    const [info, setInfo] = useState(null);
    const [offline, setOffline] = useState(false);
    const [chatKey, setChatKey] = useState(0);

    useEffect(() => {
        getInfo()
            .then(setInfo)
            .catch(() => setOffline(true));
    }, []);

    // A new key remounts Chat, which clears the conversation (and stops any answer in progress)
    const newChat = () => {
        setChatKey((k) => k + 1);
        setView("chat");
    };

    // Both views stay mounted, so switching to About doesn't throw away the conversation
    return (
        <div className="shell">
            <Sidebar view={view} onNav={setView} onNew={newChat} info={info} offline={offline} />
            <div className="main">
                <Chat key={chatKey} hidden={view !== "chat"} info={info} offline={offline} />
                <About hidden={view !== "about"} info={info} />
            </div>
        </div>
    );
}
