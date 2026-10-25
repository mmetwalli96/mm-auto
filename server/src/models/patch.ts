import { neo4jGraph } from "@clients";

interface Employee {
    id: string;
    name: string;
    email: string;
}

export const updateEmployeeRecord = async (employee: Employee) => {
    const query = `
        MATCH (e:Employee {id: $id})
        SET e.name = $name, e.email = $email
    `;
    try {
        await neo4jGraph.query(query, {
            id: employee.id,
            name: employee.name,
            email: employee.email
        });
    } catch (error) {
        throw new Error(`Failed to update employee record: ${(error as Error).message}`);
    }
};