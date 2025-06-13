type Priority = "high" | "medium" | "low";

interface NotificationCardProps {
  message: string;
  priority: Priority;
}

const NotificationCard = ({ message, priority }: NotificationCardProps) => {
  const colorMap = {
    high: "bg-red-100 border-red-300 text-red-800",
    medium: "bg-yellow-100 border-yellow-300 text-yellow-800",
    low: "bg-green-100 border-green-300 text-green-800",
  };

  return (
    <div className={`p-3 rounded-lg border ${colorMap[priority]}`}>
      {message}
    </div>
  );
};

export default NotificationCard;