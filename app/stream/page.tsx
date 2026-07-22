import TabBar from "@/components/TabBar";
import StreamFeed from "@/components/StreamFeed";
import { demoMode } from "@/lib/pricing";

export default function StreamPage() {
  return (
    <>
      <div className="screen">
        <header style={{ padding: "calc(14px + env(safe-area-inset-top)) 22px 0" }}>
          <div className="display" style={{ fontSize: 22 }}>squad stream</div>
          <div style={{ fontSize: 11.5, color: "var(--dim)", fontWeight: 600, marginTop: 2 }}>
            {demoMode()
              ? "the gremlins · shared on purpose, nothing else"
              : "shared intelligence from your squad — posted on purpose, nothing else"}
          </div>
        </header>
        <StreamFeed />
      </div>
      <TabBar />
    </>
  );
}
