interface CardProps {
  title: string;
  value: number;
}

const Card = ({ title, value }: CardProps) => {
  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <h3 className="text-sm font-medium text-gray-500">{title}</h3>
      <p className="text-2xl font-bold text-blue-800">{value}</p>
    </div>
  );
};

export default Card;
