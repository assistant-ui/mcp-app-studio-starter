/**
 * Adapter: UI and utility re-exports for copy-standalone portability.
 *
 * When copying this component to another project, update these imports
 * to match your project's paths:
 *
 *   cn           → Your Tailwind merge utility (e.g., "@/lib/utils", "~/lib/cn")
 *   Button       → shadcn/ui Button
 *   Card         → shadcn/ui Card
 *   Badge        → shadcn/ui Badge
 *   Tooltip      → shadcn/ui Tooltip
 *   Skeleton     → shadcn/ui Skeleton
 *   Avatar       → shadcn/ui Avatar
 *   Separator    → shadcn/ui Separator
 *   DropdownMenu → shadcn/ui DropdownMenu
 */

export { cn } from "../../../lib/ui/cn";
export { Avatar, AvatarFallback, AvatarImage } from "../../ui/avatar";
export { Badge } from "../../ui/badge";
export { Button } from "../../ui/button";
export {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../ui/card";
export {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../ui/dropdown-menu";
export { Separator } from "../../ui/separator";
export { Skeleton } from "../../ui/skeleton";
export {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../../ui/tooltip";
