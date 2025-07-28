import { signOut } from "@/auth"

export function SignOut() {
  return (
    <form
      action={async () => {
        "use server"
        await signOut({ redirectTo: "/" })
      }}
    >
      <button
        type="submit"
        className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded"
      >
        Sign out
      </button>
    </form>
  )
}