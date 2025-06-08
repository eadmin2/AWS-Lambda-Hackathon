import React from "react";

interface HeaderProps {
  veteranName: string;
  uploadDate: string;
  combinedRating: number;
}

const Header: React.FC<HeaderProps> = ({ veteranName, uploadDate, combinedRating }) => {
  return (
    <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 bg-white border-b border-gray-200 shadow-sm">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{veteranName}</h1>
        <p className="text-sm text-gray-500">Uploaded: {uploadDate}</p>
      </div>
      <div className="flex items-center gap-2">
        <span className="inline-block bg-primary-100 text-primary-800 font-semibold px-4 py-2 rounded-full text-lg shadow">
          {combinedRating}%
        </span>
        <span className="text-xs text-gray-500 ml-2">Combined Rating</span>
      </div>
    </header>
  );
};

export default Header; 