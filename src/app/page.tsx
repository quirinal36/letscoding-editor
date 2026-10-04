import { EditorApp } from "@/components/editor-app";
import { appConfig } from "@/lib/server/config";
export const dynamic = "force-dynamic";
export default function Page() {
  return <EditorApp config={appConfig()} />;
}
