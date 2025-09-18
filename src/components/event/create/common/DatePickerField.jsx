import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

export const DatePickerField = ({ label, selected, onChange }) => (
    <div>
        <label className="block text-sm font-medium text-slate-600 mb-1">{label}</label>
        <DatePicker selected={selected} onChange={onChange} showTimeSelect timeFormat="HH:mm" timeIntervals={15} dateFormat="dd/MM/yyyy, HH:mm"
            className="w-full bg-slate-50 border border-slate-300 rounded-md shadow-sm text-slate-800 p-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
    </div>
);