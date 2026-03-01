import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { ChevronDown, Search, X } from 'lucide-react';
import styles from './SearchableSelect.module.css';

/**
 * A searchable dropdown that filters options as you type.
 *
 * Props:
 *  value          - currently selected value (string/id)
 *  onChange       - called with a synthetic { target: { value } } event (drop-in for <select> onChange)
 *  options        - array of option items
 *  getOptionValue - (opt) => string  — extract the value/id from an option
 *  getOptionLabel - (opt) => string  — extract the display label from an option
 *  placeholder    - text shown on the trigger when nothing is selected
 *  emptyOption    - if provided (string), an "empty/all" choice is shown at top of list with value=""
 *  disabled       - boolean
 *  className      - extra class applied to the container div
 *  id             - id forwarded to the container div
 */
const SearchableSelect = ({
  value,
  onChange,
  options = [],
  getOptionValue = (opt) => opt,
  getOptionLabel = (opt) => opt,
  placeholder = 'Select...',
  emptyOption = null,
  disabled = false,
  className = '',
  id,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [dropdownStyle, setDropdownStyle] = useState({});

  const triggerRef = useRef(null);
  const searchInputRef = useRef(null);
  const dropdownRef = useRef(null);

  const selectedOption = options.find((opt) => getOptionValue(opt) === value);
  const selectedLabel = selectedOption ? getOptionLabel(selectedOption) : '';

  const filteredOptions = options.filter((opt) =>
    getOptionLabel(opt).toLowerCase().includes(searchText.toLowerCase())
  );

  // Compute where the dropdown should appear (above or below the trigger)
  const updateDropdownPosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const spaceBelow = viewportHeight - rect.bottom;
    const spaceAbove = rect.top;
    const dropdownHeight = 280; // approximate max height

    const showBelow = spaceBelow >= 150 || spaceBelow >= spaceAbove;

    setDropdownStyle({
      position: 'fixed',
      left: rect.left,
      width: rect.width,
      zIndex: 99999,
      ...(showBelow
        ? {
            top: rect.bottom + 2,
            maxHeight: Math.min(dropdownHeight, Math.max(spaceBelow - 8, 120)),
          }
        : {
            bottom: viewportHeight - rect.top + 2,
            maxHeight: Math.min(dropdownHeight, Math.max(spaceAbove - 8, 120)),
          }),
    });
  }, []);

  // Reposition on scroll/resize while open
  useEffect(() => {
    if (!isOpen) return;
    updateDropdownPosition();
    window.addEventListener('scroll', updateDropdownPosition, true);
    window.addEventListener('resize', updateDropdownPosition);
    return () => {
      window.removeEventListener('scroll', updateDropdownPosition, true);
      window.removeEventListener('resize', updateDropdownPosition);
    };
  }, [isOpen, updateDropdownPosition]);

  // Focus the search input when the dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        triggerRef.current &&
        !triggerRef.current.contains(e.target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target)
      ) {
        setIsOpen(false);
        setSearchText('');
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleToggle = () => {
    if (disabled) return;
    setIsOpen((prev) => !prev);
    setSearchText('');
  };

  const handleSelect = (optValue) => {
    onChange({ target: { value: optValue } });
    setIsOpen(false);
    setSearchText('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      setSearchText('');
    }
  };

  const dropdown = isOpen
    ? ReactDOM.createPortal(
        <div ref={dropdownRef} className={styles.dropdown} style={dropdownStyle}>
          {/* Search bar */}
          <div className={styles.searchWrapper}>
            <Search size={14} className={styles.searchIcon} />
            <input
              ref={searchInputRef}
              type="text"
              className={styles.searchInput}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search..."
              aria-label="Search options"
            />
            {searchText && (
              <button
                type="button"
                className={styles.clearSearch}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setSearchText('')}
                aria-label="Clear search"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Options list */}
          <ul className={styles.optionsList} role="listbox">
            {/* "Empty / All" option */}
            {emptyOption !== null && (
              <li
                className={`${styles.option} ${!value ? styles.selected : ''}`}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleSelect('')}
                role="option"
                aria-selected={!value}
              >
                {emptyOption}
              </li>
            )}

            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => {
                const optValue = getOptionValue(opt);
                const isSelected = optValue === value;
                return (
                  <li
                    key={optValue}
                    className={`${styles.option} ${isSelected ? styles.selected : ''}`}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleSelect(optValue)}
                    role="option"
                    aria-selected={isSelected}
                  >
                    {getOptionLabel(opt)}
                  </li>
                );
              })
            ) : (
              <li className={styles.noOptions}>No results found</li>
            )}
          </ul>
        </div>,
        document.body
      )
    : null;

  return (
    <div
      className={`${styles.container} ${className} ${disabled ? styles.disabled : ''}`}
      id={id}
    >
      <button
        ref={triggerRef}
        type="button"
        className={`${styles.trigger} ${isOpen ? styles.open : ''}`}
        onClick={handleToggle}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className={`${styles.triggerText} ${!selectedLabel ? styles.placeholder : ''}`}>
          {selectedLabel || placeholder}
        </span>
        <ChevronDown
          size={16}
          className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ''}`}
        />
      </button>

      {dropdown}
    </div>
  );
};

export default SearchableSelect;
