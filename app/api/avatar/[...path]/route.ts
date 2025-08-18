import { NextRequest, NextResponse } from "next/server";

// TODO: Implementar storage de avatars com PostgreSQL/File System
// Por enquanto, retorna um avatar padrão ou erro 404
export async function GET(req: NextRequest) {
  const prefix = "/api/avatar/";
  const relativePath = decodeURIComponent(
    req.nextUrl.pathname.replace(prefix, "")
  );

  try {
    // TODO: Implementar busca de avatar no sistema de arquivos ou storage
    // Por enquanto, retorna um avatar padrão do Gravatar ou erro 404
    
    console.log("Avatar solicitado:", relativePath);
    
    // Retornar um avatar padrão do Gravatar como fallback
    const defaultAvatarUrl = "https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y&s=200";
    
    return NextResponse.redirect(defaultAvatarUrl, 302);
    
  } catch (error) {
    console.error("Erro ao buscar avatar:", error);
    return NextResponse.json(
      { error: "Avatar não encontrado" },
      { status: 404 }
    );
  }
}
