"use server";

import { pool } from "@/lib/db-pool";

/**
 * Obtém o mapa de visibilidade das redes sociais de um certificado.
 * Retorna objeto vazio caso a coluna esteja nula.
 */
export async function getSocialVisibility(
  certId: string
): Promise<Record<string, boolean>> {
  const client = await pool.connect();
  try {
    const query = 'SELECT social_visibility FROM rarcursos.certificados WHERE id = $1';
    const result = await client.query(query, [certId]);
    
    if (result.rows.length === 0) {
      throw new Error("Erro ao buscar visibilidade de redes sociais");
    }
    
    return (result.rows[0].social_visibility ?? {}) as Record<string, boolean>;
  } finally {
    client.release();
  }
}

interface ToggleParams {
  certId: string;
  key: string;
  visible: boolean;
}

/**
 * Mescla o novo valor de visibilidade na coluna jsonb `social_visibility`.
 */
export async function toggleSocialVisibility({
  certId,
  key,
  visible,
}: ToggleParams) {
  const client = await pool.connect();
  try {
    // Valor atual
    const selectQuery = 'SELECT social_visibility FROM rarcursos.certificados WHERE id = $1';
    const selectResult = await client.query(selectQuery, [certId]);
    
    if (selectResult.rows.length === 0) {
      throw new Error("Falha ao buscar visibilidade atual");
    }

    const current = (selectResult.rows[0].social_visibility ?? {}) as Record<string, boolean>;
    const newVis = { ...current, [key]: visible };

    // Persistir
    const updateQuery = 'UPDATE rarcursos.certificados SET social_visibility = $1 WHERE id = $2';
    await client.query(updateQuery, [JSON.stringify(newVis), certId]);

    return { success: true } as const;
  } finally {
    client.release();
  }
}