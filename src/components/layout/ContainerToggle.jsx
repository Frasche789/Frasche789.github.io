/**
 * ContainerToggle component
 * 
 * @param {Object} props - Component props
 * @param {Function} props.onToggle - Callback function when toggle is clicked
 * @param {string} props.title - Title for the toggle
 * @param {string} props.description - Description for the toggle
 * @param {boolean} props.isExpanded - Whether the container is currently expanded
 */
function ContainerToggle({ onToggle, title, description, isExpanded }) {
  return (
    <div className="container-toggle" onClick={onToggle}>
      <div className="toggle-content">
        <span className="toggle-title">{title}</span>
        <span className="toggle-icon">{isExpanded ? '▼' : '▲'}</span>
      </div>
      <p>{description}</p>
    </div>
  );
}

export default ContainerToggle;