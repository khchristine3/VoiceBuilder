// Mock leads standing in for a CRM. Real integration (Salesforce/HubSpot)
// is out of scope for the assignment (see DECISIONS.md #7) -- a lead is
// just a name and a phone number, so this satisfies the brief without
// building OAuth. Field names map directly onto common CRM contact
// properties (HubSpot: firstname+lastname, company, jobtitle, phone), so
// swapping in a real record is a one-line change to where this list comes
// from, not a rearchitecture of anything that consumes it.
export type Lead = {
  id: string;
  name: string;
  company: string;
  role: string;
  phone: string;
};

export const MOCK_LEADS: Lead[] = [
  {
    id: "1",
    name: "Dana Cohen",
    company: "Northwind Logistics",
    role: "VP of Operations",
    phone: "+1-555-0101",
  },
  {
    id: "2",
    name: "Marcus Chen",
    company: "Brightline SaaS",
    role: "Head of Sales",
    phone: "+1-555-0102",
  },
  {
    id: "3",
    name: "Priya Patel",
    company: "Fernbank Retail",
    role: "Director of IT",
    phone: "+1-555-0103",
  },
];
