/**
 * ContainerWrapper
 * 
 * A reusable wrapper component that applies semantic theme styling
 * based on the container type (current, future, archive).
 * 
 * Features:
 * - Automatically applies the correct emphasis level based on container type
 * - Handles consistent styling via ThemeContext
 * - Provides dynamic CSS variables for child components
 * - Adds appropriate data attributes for accessibility and styling hooks
 */

import React from 'react';
import PropTypes from 'prop-types';
import { useTheme } from '../../context/ThemeContext';

function ContainerWrapper({ 
  containerType,
  className, 
  children, 
  additionalStyles = {}, 
  ...props 
}) {
  // Get styling information from theme context
  const { getContainerStyles, getContainerEmphasis } = useTheme();
  const containerStyles = getContainerStyles(containerType);
  const emphasisLevel = getContainerEmphasis(containerType);

  // Set dynamic CSS variables for styling
  const dynamicStyle = {
    '--container-opacity': containerStyles.opacity,
    '--container-spacing': containerStyles.spacing,
    '--container-shadow': containerStyles.shadow,
    '--container-border-width': containerStyles.borderWidth,
    ...additionalStyles
  };

  // Build the compound className
  const fullClassName = `${containerType}-tasks-container ${containerStyles.getClass()} ${className || ''}`.trim();

  return (
    <div
      className={fullClassName}
      style={dynamicStyle}
      data-emphasis={emphasisLevel}
      data-container-type={containerType}
      {...props}
    >
      {children}
    </div>
  );
}

ContainerWrapper.propTypes = {
  containerType: PropTypes.oneOf(['current', 'future', 'archive']).isRequired,
  className: PropTypes.string,
  children: PropTypes.node.isRequired,
  additionalStyles: PropTypes.object
};

export default ContainerWrapper;
