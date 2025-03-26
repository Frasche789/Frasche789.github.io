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
    <div className="container-toggle">
      <button onClick={onToggle}>
        {title}
        <span className="toggle-icon">{isExpanded ? 'Hide' : 'Show'}</span>
      </button>
      <p>{description}</p>
    </div>
  );
}

export default ContainerToggle;