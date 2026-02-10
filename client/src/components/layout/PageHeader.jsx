import { useNavigate } from 'react-router-dom';

export default function PageHeader({ title, subtitle, back }) {
  const navigate = useNavigate();

  return (
    <div className="px-5 pt-10">
      {back && (
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 mb-4 bg-transparent border-none cursor-pointer"
        >
          <span className="text-accent text-lg">&larr;</span>
          <span className="text-accent text-sm">Back</span>
        </button>
      )}
      {title && (
        <h1 className="text-[22px] font-bold text-white m-0">{title}</h1>
      )}
      {subtitle && (
        <p className="text-[13px] text-text-muted mt-1 mb-0">{subtitle}</p>
      )}
    </div>
  );
}
