import React, { useState, useRef } from "react";
import "./App.css";

function App() {
  const [searchWord, setSearchWord] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState(null);
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState(null);
  const [files, setFiles] = useState([]);
  const eventSourceRef = useRef(null);

  // Fetch available files when component mounts
  React.useEffect(() => {
    fetchFiles();
  }, []);

  const fetchFiles = async () => {
    try {
      const response = await fetch("http://localhost:3001/api/files");
      const data = await response.json();
      setFiles(data.files || []);
    } catch (error) {
      console.error("Error fetching files:", error);
    }
  };

  const handleSearch = () => {
    if (!searchWord.trim()) {
      setError("Vui lòng nhập từ khóa để tìm kiếm");
      return;
    }

    // Close existing connection if any
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    setIsSearching(true);
    setResults(null);
    setProgress(null);
    setError(null);

    // Create SSE connection
    const eventSource = new EventSource(
      `http://localhost:3001/api/search/${encodeURIComponent(
        searchWord.trim()
      )}`
    );
    eventSourceRef.current = eventSource;

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        switch (data.status) {
          case "started":
            setProgress({
              message: "Bắt đầu tìm kiếm...",
              count: 0,
              processedFiles: 0,
              totalFiles: 0,
            });
            break;

          case "info":
            setProgress((prev) => ({
              ...prev,
              message: data.message,
              totalFiles: data.totalFiles,
            }));
            break;

          case "progress":
            setProgress({
              message: `Đang xử lý file: ${data.currentFile}`,
              count: data.count,
              processedFiles: data.processedFiles,
              totalFiles: data.totalFiles,
              percentage: Math.round(
                (data.processedFiles / data.totalFiles) * 100
              ),
            });
            break;

          case "completed":
            setResults({
              word: data.word,
              count: data.count,
              processedFiles: data.processedFiles,
              totalFiles: data.totalFiles,
            });
            setIsSearching(false);
            eventSource.close();
            break;

          case "error":
            setError(data.message);
            setIsSearching(false);
            eventSource.close();
            break;

          default:
            console.log("Unknown status:", data);
        }
      } catch (error) {
        console.error("Error parsing SSE data:", error);
      }
    };

    eventSource.onerror = (error) => {
      console.error("SSE error:", error);
      setError("Lỗi kết nối đến server");
      setIsSearching(false);
      eventSource.close();
    };
  };

  const handleStop = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setIsSearching(false);
    setProgress(null);
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  return (
    <div className="App">
      <div className="container">
        <header className="header">
          <h1>🔍 Word Search Engine</h1>
          <p>Tìm kiếm từ khóa trong các file dữ liệu lớn</p>
        </header>

        <div className="search-section">
          <div className="search-form">
            <input
              type="text"
              value={searchWord}
              onChange={(e) => setSearchWord(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Nhập từ khóa cần tìm..."
              className="search-input"
              disabled={isSearching}
            />
            <div className="button-group">
              <button
                onClick={handleSearch}
                disabled={isSearching || !searchWord.trim()}
                className="search-button"
              >
                {isSearching ? "Đang tìm..." : "Tìm kiếm"}
              </button>
              {isSearching && (
                <button onClick={handleStop} className="stop-button">
                  Dừng
                </button>
              )}
            </div>
          </div>

          {files.length > 0 && (
            <div className="files-info">
              <h3>📁 Files có sẵn ({files.length} files):</h3>
              <div className="files-list">
                {files.map((file, index) => (
                  <div key={index} className="file-item">
                    <span className="file-name">{file.name}</span>
                    <span className="file-size">{file.sizeFormatted}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {error && <div className="error-message">❌ {error}</div>}

        {progress && (
          <div className="progress-section">
            <h3>⏳ Tiến trình tìm kiếm</h3>
            <div className="progress-info">
              <p>
                <strong>Từ khóa:</strong> "{searchWord}"
              </p>
              <p>
                <strong>Trạng thái:</strong> {progress.message}
              </p>
              <p>
                <strong>Số lần tìm thấy hiện tại:</strong>{" "}
                <span className="count">{progress.count.toLocaleString()}</span>
              </p>
              <p>
                <strong>Tiến độ:</strong> {progress.processedFiles}/
                {progress.totalFiles} files ({progress.percentage || 0}%)
              </p>
            </div>
            {progress.percentage > 0 && (
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${progress.percentage}%` }}
                ></div>
              </div>
            )}
          </div>
        )}

        {results && (
          <div className="results-section">
            <h3>✅ Kết quả tìm kiếm</h3>
            <div className="results-info">
              <p>
                <strong>Từ khóa:</strong> "{results.word}"
              </p>
              <p>
                <strong>Tổng số lần xuất hiện:</strong>{" "}
                <span className="final-count">
                  {results.count.toLocaleString()}
                </span>
              </p>
              <p>
                <strong>Đã xử lý:</strong> {results.processedFiles}/
                {results.totalFiles} files
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
