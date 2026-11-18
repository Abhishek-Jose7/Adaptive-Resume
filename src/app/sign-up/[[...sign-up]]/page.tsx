import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
      <div className="mb-6 text-center">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center font-black text-xl text-white shadow-lg shadow-blue-500/20 mx-auto mb-2">
          R
        </div>
        <h1 className="text-xl font-bold text-white tracking-tight">Create your Account</h1>
        <p className="text-xs text-slate-400 mt-1">100% Free Tier • Zero credit card required</p>
      </div>
      <SignUp
        appearance={{
          elements: {
            rootBox: "mx-auto",
            card: "bg-slate-900 border border-slate-800 shadow-2xl",
          },
        }}
      />
    </div>
  );
}
