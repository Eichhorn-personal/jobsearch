import Container from "react-bootstrap/Container";
import Header from "./components/Header";
import DataTable from "./components/DataTable";

export default function App() {
  return (
    <>
      <Header />

      <Container className="mt-4">
        <h2>Local Spreadsheet App</h2>
        <DataTable />
      </Container>
    </>
  );
}