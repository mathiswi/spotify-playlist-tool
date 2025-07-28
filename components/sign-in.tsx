import { signIn } from "@/auth"

export function SignIn() {
  return (
    <form
      action={async () => {
        "use server"
        await signIn("spotify", { redirectTo: "/" })
      }}
    >
      <button
        type="submit"
        className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded"
      >
        Sign in with Spotify
      </button>
    </form>
  )
}