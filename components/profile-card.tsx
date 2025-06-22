"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  LogOut,
  Settings,
  User,
  Mail,
  Phone,
  ChevronRight,
} from "lucide-react";

interface ProfileCardProps {
  name: string;
  email?: string;
  phone?: string;
  onSignOut: () => void;
}

export default function ProfileCard({
  name,
  email,
  phone,
  onSignOut,
}: ProfileCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  // Get initials from name
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  // Animation variants
  const cardVariants = {
    initial: { y: 20, opacity: 0 },
    animate: { y: 0, opacity: 1 },
    hover: { y: -5, transition: { duration: 0.2 } },
  };

  const iconVariants = {
    initial: { scale: 1 },
    hover: { scale: 1.1, transition: { duration: 0.2 } },
  };

  const detailsVariants = {
    initial: { x: -10, opacity: 0 },
    animate: { x: 0, opacity: 1 },
  };

  return (
    <motion.div
      initial="initial"
      animate="animate"
      whileHover="hover"
      variants={cardVariants}
      className="w-full"
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
    >
      <Card className="bg-white/90 backdrop-blur-sm border-2 border-indigo-100 overflow-hidden">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <motion.div variants={iconVariants}>
                <Avatar className="h-16 w-16 ring-2 ring-indigo-100">
                  <AvatarImage
                    src={`https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
                      name
                    )}`}
                  />
                  <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-lg">
                    {getInitials(name)}
                  </AvatarFallback>
                </Avatar>
              </motion.div>

              <div className="space-y-1">
                <motion.h2
                  variants={detailsVariants}
                  className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent"
                >
                  {name}
                </motion.h2>
                <motion.div variants={detailsVariants} className="space-y-1">
                  {email && (
                    <div className="flex items-center text-gray-600">
                      <Mail className="h-4 w-4 mr-2" />
                      <span className="text-sm">{email}</span>
                    </div>
                  )}
                  {phone && (
                    <div className="flex items-center text-gray-600">
                      <Phone className="h-4 w-4 mr-2" />
                      <span className="text-sm">{phone}</span>
                    </div>
                  )}
                </motion.div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <motion.div variants={iconVariants} className="flex space-x-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-gray-600 hover:text-indigo-600 hover:bg-indigo-50"
                >
                  <Settings className="h-5 w-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={onSignOut}
                >
                  <LogOut className="h-5 w-5" />
                </Button>
              </motion.div>
              <motion.div
                animate={{ rotate: isHovered ? 90 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronRight className="h-5 w-5 text-gray-400" />
              </motion.div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
