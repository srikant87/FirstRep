(function boot() {
  function libsReady() {
    return !!(window.React && window.ReactDOM && window.Recharts);
  }
  if (!libsReady()) {
    return setTimeout(boot, 50); // retry until scripts are loaded
  }

  const { useState } = window.React;
  const { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } = window.Recharts;

  function App() {
    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [pain, setPain] = useState("");
    const [progress, setProgress] = useState([]);
    const [painScale, setPainScale] = useState(5);

    function saveProgress() {
      if (/^(\d)\1+$/.test(phone)) {
        alert("Invalid phone number");
        return;
      }
      const record = { name, phone, pain, progress, painScale };
      console.log("Saving to JSONBin:", record);
      fetch(window.appConfig.jsonBinUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Master-Key": window.appConfig.jsonBinKey
        },
        body: JSON.stringify(record)
      }).then(() => alert("Progress saved"));
    }

    return (
      React.createElement("div", { style: { padding: 20 } },
        React.createElement("h1", null, "FirstRep Recovery Tracker"),
        React.createElement("input", {
          placeholder: "Name", value: name, onChange: e => setName(e.target.value)
        }),
        React.createElement("input", {
          placeholder: "Phone", value: phone, onChange: e => setPhone(e.target.value)
        }),
        React.createElement("textarea", {
          placeholder: "Pain points", value: pain, onChange: e => setPain(e.target.value)
        }),
        React.createElement("button", { onClick: saveProgress }, "Save Progress"),
        React.createElement("div", { style: { height: 300, marginTop: 20 } },
          React.createElement(ResponsiveContainer, { width: "100%", height: "100%" },
            React.createElement(LineChart, { data: progress },
              React.createElement(CartesianGrid, { strokeDasharray: "3 3" }),
              React.createElement(XAxis, { dataKey: "day" }),
              React.createElement(YAxis),
              React.createElement(Tooltip, null),
              React.createElement(Line, { type: "monotone", dataKey: "painScale", stroke: "#2563eb" })
            )
          )
        )
      )
    );
  }

  window.ReactDOM.render(React.createElement(App), document.getElementById("root"));
})();
