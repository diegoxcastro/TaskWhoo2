import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

export default function UserProfile() {
  const { user } = useAuth();
  
  if (!user) return null;
  
  // Calculate percentages for progress bars
  const healthPercentage = Math.min(100, Math.max(0, (user.health / user.maxHealth) * 100));
  const xpToNextLevel = 50 * (user.level); // Simple formula: level * 50
  const xpPercentage = Math.min(100, Math.max(0, (user.experience / xpToNextLevel) * 100));

  return (
    <div className="bg-primary-dark text-white">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center">
          <div className="mr-4">
            <img
              src={user.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=80&h=80"}
              alt="User Avatar"
              className="h-16 w-16 rounded-full border-2 border-white"
            />
          </div>
          <div className="flex-grow">
            <div className="flex items-center">
              <h2 className="font-heading font-semibold text-lg">{user.username}</h2>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="w-5 h-5 ml-2 text-amber-400"
              >
                <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" clipRule="evenodd" />
              </svg>
            </div>
            <p className="text-gray-300 text-sm">
              Nível {user.level} Aventureiro
            </p>
            
            {/* Just XP info */}
            <div className="mt-2">
              <div className="text-center">
                <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded-full">
                  {user.experience} XP
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
