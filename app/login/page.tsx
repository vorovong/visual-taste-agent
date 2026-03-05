import { signIn } from "@/lib/auth";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Visual Taste Agent</h1>
        <p className="text-neutral-400">시각적 취향을 발견하고 체계화하세요</p>
        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/" });
          }}
        >
          <button
            type="submit"
            className="rounded-lg bg-white px-6 py-3 text-sm font-medium text-neutral-900 hover:bg-neutral-200 transition-colors"
          >
            Google로 로그인
          </button>
        </form>
      </div>
    </div>
  );
}
