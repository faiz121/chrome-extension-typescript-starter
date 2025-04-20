import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import ReactMarkdown from "react-markdown";

const LoadingBar = ({ delay = 0, width, gradient }) => (
  <div 
    className="h-5 rounded-sm overflow-hidden bg-blue-50"
    style={{ 
      width: `min(${width}, 100%)`,  // Constrain to parent width
      maxWidth: '300px'  // Add max-width limit
    }}
  >
    <div
      className="h-full w-[200%]"
      style={{
        background: gradient,
        animation: `moveGradient 1.5s linear infinite ${delay}ms`,
        transform: 'translateX(-50%)'
      }}
    />
  </div>
);

const LoadingContent = () => (
  <div className="flex flex-col gap-3 w-full max-w-[300px] w-fit"> {/* Add width constraints */}
    <LoadingBar 
      width="90%" 
      delay={0} 
      gradient="linear-gradient(90deg, transparent 0%, transparent 25%, #3B82F6 50%, transparent 75%, transparent 100%)"
    />
    <LoadingBar 
      width="100%" 
      delay={200} 
      gradient="linear-gradient(90deg, transparent 0%, transparent 25%, #60A5FA 50%, transparent 75%, transparent 100%)"
    />
    <LoadingBar 
      width="80%" 
      delay={400} 
      gradient="linear-gradient(90deg, transparent 0%, transparent 25%, #93C5FD 50%, transparent 75%, transparent 100%)"
    />
  </div>
);

const SystemMessageBubble = ({ content, isLoading, title, contextIndicator }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const contentRef = useRef(null);
  const [shouldShowExpand, setShouldShowExpand] = useState(false);
  const [contentHeight, setContentHeight] = useState(0);

  useEffect(() => {
    if (contentRef.current && !isLoading) {
      const height = contentRef.current.scrollHeight;
      setContentHeight(height);
      setShouldShowExpand(height > 180);
    }
  }, [content, isLoading]);


  return (
    <div className="flex items-start space-x-2">
      <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-500 flex-shrink-0">
        <Sparkles className="w-5 h-5" />
      </div>
      
      <div className="relative w-[400px] max-w-full rounded-2xl bg-white shadow-sm">
        {contextIndicator && (
          <div className="absolute top-0 left-0 right-0 bg-blue-50 text-blue-600 text-xs px-3 py-1.5 rounded-t-2xl border-b border-gray-200">
            {contextIndicator}
          </div>
        )}
        <div className={`p-4 ${contextIndicator ? 'pt-7' : ''}`}>
          {title && <div className="font-medium text-gray-900 mb-3">{title}</div>}
          
          <div className="relative">
            <div 
              ref={contentRef}
              className="font-sans text-base transition-all duration-300 ease-in-out prose"
              style={{ 
                maxHeight: isExpanded ? `${contentHeight + 100}px` : '200px',
                overflow: 'hidden',
              }}
            >
              {isLoading ? (
                <LoadingContent />
              ) : (
                <ReactMarkdown 
                className="prose prose-sm prose-slate"
                 components={{
                    h1: ({node, ...props}) => <h1 {...props} className="text-xl font-bold my-4"/>,
                    h2: ({node, ...props}) => <h2 {...props} className="text-lg font-semibold my-3"/>,
                    h3: ({node, ...props}) => <h3 {...props} className="text-md font-medium my-2"/>,
                    ul: ({node, ...props}) => <ul {...props} className="list-disc list-inside my-2"/>,
                    li: ({node, ...props}) => <li {...props} className="my-1"/>
                  }}
              >{content}</ReactMarkdown>
              )}
            </div>
            
            {!isExpanded && shouldShowExpand && !isLoading && (
              <div 
                className="absolute bottom-0 left-0 right-0 h-24"
                style={{
                  background: 'linear-gradient(to bottom, transparent, rgba(255,255,255,0.5) 30%, rgba(255,255,255,0.8) 60%, rgba(255,255,255,1) 100%)',
                  pointerEvents: 'none'
                }}
              />
            )}
          </div>

          {shouldShowExpand && !isLoading && (
            <div className="mt-2 text-center">
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="inline-flex items-center text-sm text-blue-500 hover:text-blue-600"
              >
                {isExpanded ? (
                  <>
                    <ChevronUp className="w-4 h-4" />
                    <span className="ml-1">Show less</span>
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4" />
                    <span className="ml-1">Show more</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Add this to your global CSS
const styles = `
@keyframes moveGradient {
  0% {
    transform: translateX(-50%);
  }
  100% {
    transform: translateX(50%);
  }
}
`;

const SystemMessageBubbleWithStyles = (props) => {
  React.useEffect(() => {
    const styleSheet = document.createElement("style");
    styleSheet.innerText = styles;
    document.head.appendChild(styleSheet);
    return () => document.head.removeChild(styleSheet);
  }, []);

  return <SystemMessageBubble {...props} />;
};

export default SystemMessageBubbleWithStyles;