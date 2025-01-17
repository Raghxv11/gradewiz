import React, { useState, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import './PdfRendering.css';

// Set up the worker for PDF.js
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

function PdfRendering() {
  const [pdfFile, setPdfFile] = useState(null);
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [isDrawing, setIsDrawing] = useState(false);
  const [boxes, setBoxes] = useState([]);
  const [currentBox, setCurrentBox] = useState(null);
  const [coordinates, setCoordinates] = useState([]);
  const overlayRef = useRef(null);
  const [showMessage, setShowMessage] = useState(false);

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file && file.type === 'application/pdf') {
      setPdfFile(URL.createObjectURL(file));
    } else {
      alert('Please upload a valid PDF file');
    }
  };

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
    setPageNumber(1);
  };

  const startDrawing = (e) => {
    if (!overlayRef.current) return;
    
    const rect = overlayRef.current.getBoundingClientRect();
    const startX = e.clientX - rect.left;
    const startY = e.clientY - rect.top;
    
    setIsDrawing(true);
    setCurrentBox({
      startX,
      startY,
      width: 0,
      height: 0,
      page: pageNumber
    });
  };

  const updateDrawing = (e) => {
    if (!isDrawing || !currentBox || !overlayRef.current) return;

    const rect = overlayRef.current.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;

    setCurrentBox(prev => ({
      ...prev,
      width: currentX - prev.startX,
      height: currentY - prev.startY
    }));
  };

  const stopDrawing = () => {
    if (!isDrawing || !currentBox) return;

    // Only add the box if it has some size
    if (Math.abs(currentBox.width) > 5 && Math.abs(currentBox.height) > 5) {
      setBoxes(prev => [...prev, {
        ...currentBox,
        // Ensure width and height are positive
        width: Math.abs(currentBox.width),
        height: Math.abs(currentBox.height),
        // Adjust startX and startY if width or height is negative
        startX: currentBox.width < 0 ? currentBox.startX + currentBox.width : currentBox.startX,
        startY: currentBox.height < 0 ? currentBox.startY + currentBox.height : currentBox.startY
      }]);
    }
    
    setIsDrawing(false);
    setCurrentBox(null);
  };

  const handleConfirm = () => {
    const newCoordinates = boxes.map(box => ({
      page: box.page,
      coordinates: {
        topLeftX: Math.round(box.startX),
        topLeftY: Math.round(box.startY),
        bottomRightX: Math.round(box.startX + box.width),
        bottomRightY: Math.round(box.startY + box.height)
      }
    }));
    
    setCoordinates(newCoordinates);
    setShowMessage(true);
    
    // Hide message after 3 seconds
    setTimeout(() => {
      setShowMessage(false);
    }, 3000);
  };

  const handleBoxDelete = (indexToDelete) => {
    setBoxes(prevBoxes => prevBoxes.filter((_, index) => index !== indexToDelete));
    // Clear coordinates display when a box is deleted
    setCoordinates([]);
  };

  return (
    <div className="pdf-container">
      <div className="controls">
        <input
          type="file"
          accept=".pdf"
          onChange={handleFileChange}
        />
        {pdfFile && (
          <>
            <div className="navigation">
              <button
                disabled={pageNumber <= 1}
                onClick={() => setPageNumber(pageNumber - 1)}
              >
                Previous
              </button>
              <span>
                Page {pageNumber} of {numPages}
              </span>
              <button
                disabled={pageNumber >= numPages}
                onClick={() => setPageNumber(pageNumber + 1)}
              >
                Next
              </button>
            </div>
            <button 
              className="confirm-button"
              onClick={handleConfirm}
              disabled={boxes.length === 0}
            >
              Confirm Selections
            </button>
          </>
        )}
        {showMessage && (
          <div className="success-message">
            Coordinates generated successfully!
          </div>
        )}
      </div>

      <div className="pdf-viewer">
        {pdfFile && (
          <Document
            file={pdfFile}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={console.error}
          >
            <div
              ref={overlayRef}
              style={{ position: 'relative' }}
              onMouseDown={startDrawing}
              onMouseMove={updateDrawing}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
            >
              <Page
                pageNumber={pageNumber}
                renderTextLayer={true}
                renderAnnotationLayer={true}
              />
              <div className="drawing-overlay">
                {boxes
                  .filter(box => box.page === pageNumber)
                  .map((box, index) => (
                    <div
                      key={index}
                      className="selection-box"
                      style={{
                        left: box.startX,
                        top: box.startY,
                        width: box.width,
                        height: box.height
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleBoxDelete(index);
                      }}
                    >
                      <div className="delete-icon">×</div>
                    </div>
                  ))}
                {currentBox && (
                  <div
                    className="selection-box active-selection"
                    style={{
                      left: currentBox.width < 0 ? currentBox.startX + currentBox.width : currentBox.startX,
                      top: currentBox.height < 0 ? currentBox.startY + currentBox.height : currentBox.startY,
                      width: Math.abs(currentBox.width),
                      height: Math.abs(currentBox.height)
                    }}
                  />
                )}
              </div>
            </div>
          </Document>
        )}
      </div>

      {coordinates.length > 0 && (
        <div className="coordinates-display">
          <h3>Selected Coordinates:</h3>
          {coordinates.map((selection, index) => (
            <div key={index} className="coordinate-item">
              <h4>Selection {index + 1} (Page {selection.page})</h4>
              <ul>
                <li>Top Left: ({selection.coordinates.topLeftX}, {selection.coordinates.topLeftY})</li>
                <li>Bottom Right: ({selection.coordinates.bottomRightX}, {selection.coordinates.bottomRightY})</li>
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default PdfRendering;
