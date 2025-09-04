
import { useEffect, useState } from "react";

const CustomCursor = () => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [clicked, setClicked] = useState(false);
  const [linkHovered, setLinkHovered] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [isOutside, setIsOutside] = useState(false);

  useEffect(() => {
    const addEventListeners = () => {
      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseenter", onMouseEnter);
      document.addEventListener("mouseleave", onMouseLeave);
      document.addEventListener("mousedown", onMouseDown);
      document.addEventListener("mouseup", onMouseUp);
    };

    const removeEventListeners = () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseenter", onMouseEnter);
      document.removeEventListener("mouseleave", onMouseLeave);
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("mouseup", onMouseUp);
    };

    const onMouseMove = (e: MouseEvent) => {
      setPosition({ x: e.clientX, y: e.clientY });
      
      const target = e.target as HTMLElement;
      const isLink = target.tagName.toLowerCase() === 'a' || 
                    target.tagName.toLowerCase() === 'button' ||
                    !!target.closest('a') || 
                    !!target.closest('button') ||
                    target.classList.contains('cursor-pointer');
                    
      setLinkHovered(!!isLink);
    };

    const onMouseDown = () => {
      setClicked(true);
    };

    const onMouseUp = () => {
      setClicked(false);
    };

    const onMouseLeave = () => {
      setHidden(true);
      setIsOutside(true);
    };

    const onMouseEnter = () => {
      setHidden(false);
      setIsOutside(false);
    };

    addEventListeners();
    return () => removeEventListeners();
  }, []);

  // Hide the default cursor
  useEffect(() => {
    document.body.classList.add("prevent-cursor");

    return () => {
      document.body.classList.remove("prevent-cursor");
    };
  }, []);

  const cursorClasses = `
    fixed top-0 left-0 pointer-events-none z-[9999]
    flex items-center justify-center
    mix-blend-difference
    transition-all duration-100 ease-out
    ${clicked ? "scale-90" : ""}
    ${hidden ? "opacity-0" : "opacity-100"}
    ${isOutside ? "hidden" : ""}
  `;

  return (
    <>
      <div
        className={cursorClasses}
        style={{
          transform: `translate(${position.x}px, ${position.y}px)`,
        }}
      >
        <div
          className={`
            rounded-full bg-white
            transition-all duration-150
            flex items-center justify-center
            ${linkHovered ? "w-6 h-6 bg-opacity-80" : "w-4 h-4"}
            ${clicked ? "animate-cursor-pulse" : ""}
          `}
        />
      </div>
    </>
  );
};

export default CustomCursor;
