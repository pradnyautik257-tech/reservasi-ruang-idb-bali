export function FacilityCheckboxes({
  facilities,
  selected = [],
}: {
  facilities: string[];
  selected?: string[];
}) {
  return (
    <div className="chips" role="group" aria-label="Filter fasilitas">
      {facilities.map((facility) => (
        <label key={facility} className="chip">
          <input type="checkbox" name="fasilitas" value={facility} defaultChecked={selected.includes(facility)} />
          {facility}
        </label>
      ))}
    </div>
  );
}
