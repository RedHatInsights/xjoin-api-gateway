export interface Artifact {
    id: string,
    name: string,
    description: string,
    createdOn: string,
    createdBy: string,
    type: string,
    labels: string[],
    state: string,
    modifiedOn: string,
    groupId: string
}

export interface ArtifactsResponse {
    artifacts: Artifact[]
}
